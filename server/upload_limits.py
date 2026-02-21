"""
Validação de tamanho de uploads. Evita processar ficheiros demasiado grandes.
"""
from fastapi import HTTPException, UploadFile

from config import get_settings

CHUNK_SIZE = 1024 * 1024  # 1 MB por chunk


async def read_upload_with_limit(file: UploadFile) -> bytes:
    """
    Lê o conteúdo do ficheiro até um limite máximo (config max_upload_mb).
    Levanta HTTP 413 se o ficheiro for maior.
    """
    settings = get_settings()
    max_bytes = settings.max_upload_bytes
    chunks = []
    total = 0
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Ficheiro demasiado grande. Limite: {settings.max_upload_mb} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)
