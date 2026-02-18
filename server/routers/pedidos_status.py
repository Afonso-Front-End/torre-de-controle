"""
Rotas: pedidos com status – listagem e limpeza da coleção pedidos_com_status.
Os dados são gravados pelo import (importe-tabela-consulta-bipagems). GET devolve com paginação para o front.
Suporta filtro por datas de importação (parâmetro datas).
"""
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import PyMongoError

from database import get_db, USER_ID_FIELD
from routers.auth import require_user_id
from table_ids import require_table_id

router = APIRouter(prefix="/pedidos-status", tags=["pedidos-status"])
COLLECTION_STATUS = "pedidos_com_status"
IMPORT_DATE_FIELD = "importDate"
HEADER_FLAG = "isHeader"


def _parse_datas_query(datas: str | None) -> list[str] | None:
    if not datas or not str(datas).strip():
        return None
    return [d.strip() for d in str(datas).split(",") if d.strip()]


@router.post("/processar")
def processar_pedidos_com_status(user_id: str = Depends(require_user_id), table_id: int = Depends(require_table_id)):
    """
    No-op: os dados já são gravados no import (importe-tabela-consulta-bipagems).
    Retorna o total de documentos na coleção para compatibilidade com o front.
    """
    try:
        db = get_db()
        col = db[COLLECTION_STATUS]
        total = col.count_documents({USER_ID_FIELD: user_id})
        # total inclui cabeçalho; saved = linhas de dados
        saved = max(0, total - 1) if total > 0 else 0
        return {"saved": saved}
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao banco: {e}")


@router.get("")
def listar_pedidos_com_status(
    page: int = 1,
    per_page: int = 100,
    datas: str | None = None,
    user_id: str = Depends(require_user_id),
    table_id: int = Depends(require_table_id),
):
    """
    Lista a coleção pedidos_com_status com paginação.
    datas: opcional, vírgulas (ex: 2026-02-08,2026-02-09) – exibe apenas registros dessas datas de importação.
    """
    per_page = min(max(1, per_page), 500)
    try:
        db = get_db()
        col = db[COLLECTION_STATUS]
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao banco: {e}")

    q_user = {USER_ID_FIELD: user_id}
    query = {**q_user, IMPORT_DATE_FIELD: {"$exists": True}}
    datas_list = _parse_datas_query(datas)
    if datas_list:
        query[IMPORT_DATE_FIELD] = {"$in": datas_list}

    total = col.count_documents(query)
    if total == 0:
        header_doc = col.find_one(
            {**q_user, "$or": [{HEADER_FLAG: True}, {IMPORT_DATE_FIELD: {"$exists": False}}]},
            sort=[("_id", 1)],
        )
        header_status = list(header_doc.get("values", [])) if header_doc else []
        return {"data": [], "total": 0, "header": header_status if page == 1 else None}

    header_doc = col.find_one(
        {**q_user, "$or": [{HEADER_FLAG: True}, {IMPORT_DATE_FIELD: {"$exists": False}}]},
        sort=[("_id", 1)],
    )
    header_status = list(header_doc.get("values", [])) if header_doc else []

    skip = (page - 1) * per_page
    cursor = col.find(query).sort("_id", 1).skip(skip).limit(per_page)

    docs = []
    for doc in cursor:
        c = doc.get("createdAt")
        docs.append({
            "_id": str(doc["_id"]),
            "values": doc.get("values", []),
            "createdAt": c.isoformat() if c else None,
            "status": doc.get("status", ""),
            "dias_parado": doc.get("dias_parado"),
            "importDate": doc.get(IMPORT_DATE_FIELD),
        })

    return {"data": docs, "total": total, "header": header_status if page == 1 else None}


@router.delete("")
def limpar_pedidos_com_status(user_id: str = Depends(require_user_id), table_id: int = Depends(require_table_id)):
    """Remove todos os documentos da coleção pedidos_com_status."""
    try:
        db = get_db()
        col = db[COLLECTION_STATUS]
        result = col.delete_many({USER_ID_FIELD: user_id})
        return {"deleted": result.deleted_count}
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao limpar coleção: {e}")
