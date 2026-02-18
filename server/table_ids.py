"""
IDs fixos (1 a 20) para cada "tabela" (tela/feature) da aplicação.
Usado para configurações por tabela por usuário. O frontend envia o ID em cada requisição (header X-Table-Id).
"""
from fastapi import Header, HTTPException, status

# IDs 1–5: tabelas atuais
TABLE_ID_LISTA_TELEFONES = 1
TABLE_ID_VERIFICAR_PEDIDOS = 2
TABLE_ID_CONSULTAR_PEDIDOS = 3
TABLE_ID_RESULTADOS_CONSULTA = 4
TABLE_ID_SLA = 5

# 6–20: reservados para futuras tabelas
VALID_TABLE_IDS = set(range(1, 21))

HEADER_TABLE_ID = "x-table-id"


def parse_table_id(value: str | None) -> int | None:
    """
    Converte string do header X-Table-Id para int.
    Retorna None se value for None ou vazio; levanta ValueError se inválido.
    """
    if value is None or not str(value).strip():
        return None
    try:
        n = int(value.strip())
    except ValueError:
        raise ValueError("table_id deve ser um número entre 1 e 20")
    if n not in VALID_TABLE_IDS:
        raise ValueError("table_id deve ser entre 1 e 20")
    return n


def require_table_id(x_table_id: str | None = Header(None, alias=HEADER_TABLE_ID)) -> int:
    """
    Dependência FastAPI: exige header X-Table-Id válido (1–20).
    Usar nas rotas que pertencem a uma tabela específica.
    """
    if x_table_id is None or not str(x_table_id).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header X-Table-Id é obrigatório (número entre 1 e 20).",
        )
    try:
        return parse_table_id(x_table_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
