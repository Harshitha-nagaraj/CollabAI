#!/usr/bin/env python3
"""
CollabAI Local Speech-to-Text Worker.
Uses faster-whisper (CTranslate2) with local CPU/GPU execution.
Zero paid APIs, zero hosted cloud calls.
"""

import sys
import os
import json
import argparse
import logging

# Configure minimal logging to stderr so stdout remains purely JSON
logging.basicConfig(level=logging.WARNING, stream=sys.stderr)
logger = logging.getLogger("transcribe_worker")


def get_audio_duration(file_path: str) -> float:
    """Attempt to probe audio duration using PyAV before or during transcription."""
    try:
        import av
        with av.open(file_path) as container:
            if container.duration is not None:
                return float(container.duration) / float(av.time_base)
            # Check audio streams
            for stream in container.streams.audio:
                if stream.duration is not None and stream.time_base is not None:
                    return float(stream.duration * stream.time_base)
    except Exception as exc:
        logger.debug("Could not probe duration via av: %s", exc)
    return 0.0


def transcribe_audio(
    file_path: str,
    model_name: str = "tiny",
    device: str = "cpu",
    compute_type: str = "int8",
    language: str | None = None,
    max_duration_seconds: float = 7200.0,
) -> dict:
    if not os.path.isfile(file_path):
        return {
            "success": False,
            "error": f"Audio file not found: {file_path}",
            "error_type": "FileNotFoundError",
        }

    file_size_bytes = os.path.getsize(file_path)
    if file_size_bytes == 0:
        return {
            "success": False,
            "error": "Audio file is empty (0 bytes).",
            "error_type": "EmptyFileError",
        }

    # Verify duration limit if probeable
    pre_duration = get_audio_duration(file_path)
    if pre_duration > 0 and pre_duration > max_duration_seconds:
        return {
            "success": False,
            "error": f"Audio duration ({pre_duration:.1f}s) exceeds maximum allowed limit ({max_duration_seconds:.1f}s).",
            "error_type": "DurationLimitExceededError",
            "duration": pre_duration,
        }

    # Check faster-whisper availability
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        # Check if standard openai-whisper is available as fallback
        try:
            import whisper
            return _transcribe_with_openai_whisper(
                whisper, file_path, model_name, device, language, max_duration_seconds
            )
        except ImportError:
            return {
                "success": False,
                "error": "Neither 'faster-whisper' nor 'openai-whisper' is installed in the local Python environment. Install with: pip install faster-whisper",
                "error_type": "MissingDependencyError",
            }

    # Normalize compute_type for CPU
    if device == "cpu" and compute_type not in ("int8", "float32", "int8_float32", "int8_float16"):
        compute_type = "int8"

    try:
        model = WhisperModel(
            model_size_or_path=model_name,
            device=device,
            compute_type=compute_type,
        )

        segments_iter, info = model.transcribe(
            file_path,
            beam_size=1,  # Fast inference for tiny model
            language=language if language else None,
            vad_filter=True,  # Voice activity detection to trim silence
            vad_parameters=dict(min_silence_duration_ms=500),
        )

        segments = []
        transcript_parts = []
        total_duration = getattr(info, "duration", 0.0) or pre_duration

        for seg in segments_iter:
            text = seg.text.strip()
            if text:
                transcript_parts.append(text)
                segments.append({
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                    "text": text,
                })
                if seg.end > total_duration:
                    total_duration = seg.end

        full_transcript = " ".join(transcript_parts).strip()

        if total_duration > max_duration_seconds:
            return {
                "success": False,
                "error": f"Audio duration ({total_duration:.1f}s) exceeds maximum allowed limit ({max_duration_seconds:.1f}s).",
                "error_type": "DurationLimitExceededError",
                "duration": total_duration,
            }

        return {
            "success": True,
            "transcript": full_transcript,
            "duration": round(total_duration, 2),
            "language": getattr(info, "language", language or "unknown"),
            "language_probability": round(getattr(info, "language_probability", 1.0), 3),
            "model": model_name,
            "segments_count": len(segments),
            "segments": segments,
        }

    except Exception as exc:
        logger.exception("Transcription failed: %s", exc)
        return {
            "success": False,
            "error": str(exc),
            "error_type": type(exc).__name__,
        }


def _transcribe_with_openai_whisper(
    whisper_module,
    file_path: str,
    model_name: str,
    device: str,
    language: str | None,
    max_duration_seconds: float,
) -> dict:
    try:
        model = whisper_module.load_model(model_name, device=device)
        result = model.transcribe(
            file_path,
            language=language,
            fp16=(device != "cpu"),
        )
        transcript = result.get("text", "").strip()
        segments = [
            {
                "start": round(s.get("start", 0), 2),
                "end": round(s.get("end", 0), 2),
                "text": s.get("text", "").strip(),
            }
            for s in result.get("segments", [])
            if s.get("text", "").strip()
        ]
        duration = segments[-1]["end"] if segments else 0.0
        return {
            "success": True,
            "transcript": transcript,
            "duration": round(duration, 2),
            "language": result.get("language", language or "unknown"),
            "model": model_name,
            "segments_count": len(segments),
            "segments": segments,
        }
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "error_type": type(exc).__name__,
        }


def main():
    parser = argparse.ArgumentParser(description="CollabAI Local Whisper Transcription Worker")
    parser.add_argument("--file", required=True, help="Path to local audio file")
    parser.add_argument(
        "--model",
        default=os.environ.get("WHISPER_MODEL", "tiny"),
        help="Whisper model name (default: tiny; options: tiny, base, small, medium, large-v3)",
    )
    parser.add_argument(
        "--device",
        default=os.environ.get("WHISPER_DEVICE", "cpu"),
        help="Device to run inference on ('cpu' or 'cuda')",
    )
    parser.add_argument(
        "--compute-type",
        default=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"),
        help="Quantization compute type (int8, float32, float16)",
    )
    parser.add_argument(
        "--language",
        default=os.environ.get("WHISPER_LANGUAGE", None),
        help="Optional ISO-639-1 language code (e.g. 'en', 'es')",
    )
    parser.add_argument(
        "--max-duration",
        type=float,
        default=float(os.environ.get("WHISPER_MAX_DURATION_SECONDS", "7200.0")),
        help="Maximum allowed duration in seconds (default: 7200 / 2 hours)",
    )

    args = parser.parse_args()

    result = transcribe_audio(
        file_path=args.file,
        model_name=args.model,
        device=args.device,
        compute_type=args.compute_type,
        language=args.language,
        max_duration_seconds=args.max_duration,
    )

    # Print pure JSON output to stdout
    print(json.dumps(result, ensure_ascii=False))

    if not result.get("success"):
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
