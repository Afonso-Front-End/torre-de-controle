"""
Schemas Pydantic para as rotas de resultados da consulta.
"""
from pydantic import BaseModel, Field
from typing import Optional


class ProcessarResultadosRequest(BaseModel):
    """Payload para processar e gravar na coleção base ou motorista."""
    numeros_jms: Optional[list[str]] = Field(default_factory=list, alias="numerosJms")
    numerosJms: Optional[list[str]] = None  # alias alternativo do front
    colecao: str = "motorista"

    class Config:
        populate_by_name = True


class ProcessarResultadosResponse(BaseModel):
    """Resposta do processar / auto-enviar."""
    saved: int = 0
    skipped: int = 0
    rejected_tipo_bipagem: int = 0
    colecao: str = "motorista"
    message: Optional[str] = None


class ListaMotoristaResponse(BaseModel):
    """Resposta da listagem paginada da coleção motorista."""
    data: list
    total: int


class NumerosJmsResponse(BaseModel):
    """Resposta com lista de números JMS da coleção motorista."""
    numeros: list[str] = Field(default_factory=list)
