"""
Rotas: resultados da consulta – recebe números de pedido JMS, cruza com coleção pedidos
e pedidos_com_status, grava na coleção motorista (e base se necessário).

Utiliza services.resultados_consulta para lógica de negócio.
"""
import warnings
warnings.filterwarnings("ignore", message="Workbook contains no default style", module="openpyxl")

from datetime import datetime, timezone
from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pymongo.errors import PyMongoError

from database import get_db, USER_ID_FIELD
from routers.auth import require_user_id
from table_ids import require_table_id
from services import resultados_consulta as svc
from upload_limits import read_upload_with_limit
from schemas.resultados_consulta import ProcessarResultadosResponse, ListaMotoristaResponse, NumerosJmsResponse

router = APIRouter(prefix="/resultados-consulta", tags=["resultados-consulta"])


@router.post("/processar", response_model=ProcessarResultadosResponse)
def processar_resultados(
    body: dict,
    user_id: str = Depends(require_user_id),
    table_id: int = Depends(require_table_id),
):
    """
    Recebe uma lista de números de pedido JMS. Para cada um que existir em pedidos_com_status,
    monta um documento (enriquecido com pedidos se existir) e grava na coleção base ou motorista.
    Body esperado: { "numeros_jms": ["...", "..."], "colecao": "motorista"|"base" }
    """
    numeros_jms = body.get("numeros_jms") or body.get("numerosJms") or []
    if not isinstance(numeros_jms, list):
        numeros_jms = []
    numeros_jms = [str(n).strip() for n in numeros_jms if n is not None and str(n).strip()]

    colecao = (body.get("colecao") or "motorista").strip().lower()
    if colecao not in ("base", "motorista"):
        colecao = "motorista"

    if not numeros_jms:
        return ProcessarResultadosResponse(
            saved=0, skipped=0, rejected_tipo_bipagem=0, colecao=colecao,
            message="Nenhum número JMS enviado.",
        )

    try:
        db = get_db()
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao banco: {e}")

    q_user = {USER_ID_FIELD: user_id}
    first_pedidos = db[svc.COLLECTION_PEDIDOS].find_one({**q_user, "isHeader": True}) or db[svc.COLLECTION_PEDIDOS].find_one(q_user, sort=[("_id", 1)])
    if not first_pedidos:
        return ProcessarResultadosResponse(saved=0, message="Coleção pedidos vazia.")
    idx_jms = svc.idx_numero_pedido_jms(list(first_pedidos.get("values", [])))
    if idx_jms < 0:
        raise HTTPException(status_code=400, detail="Coleção pedidos sem coluna 'Número de pedido JMS'.")

    config = {}
    if colecao == "motorista":
        try:
            user = db[svc.COLLECTION_USUARIOS].find_one({"_id": ObjectId(user_id)})
            config = (user or {}).get("config") or {}
        except Exception:
            pass
    motorista_prefixos = svc.motorista_prefixos_list(config) if colecao == "motorista" else None
    motorista_exigir = svc.exigir_digitalizador_motorista(config) if colecao == "motorista" else True
    if colecao == "motorista" and motorista_prefixos:
        svc.salvar_prefixos_motorista_no_utilizador(db, user_id, motorista_prefixos)

    result = svc.processar_e_gravar(
        db, numeros_jms, colecao, user_id,
        motorista_prefixos=motorista_prefixos,
        motorista_exigir_digitalizador=motorista_exigir,
    )
    parts = []
    if result["saved"] > 0:
        parts.append(f"{result['saved']} gravado(s).")
    if result["skipped"] > 0:
        parts.append(f"{result['skipped']} já existiam (não duplicados).")
    if result["rejected_tipo_bipagem"] > 0:
        parts.append(f"{result['rejected_tipo_bipagem']} não enviados (não atendem critério Digitalizador + Correio com prefixo).")
    message = " ".join(parts) if parts else None
    return ProcessarResultadosResponse(
        saved=result["saved"],
        skipped=result["skipped"],
        rejected_tipo_bipagem=result["rejected_tipo_bipagem"],
        colecao=colecao,
        message=message,
    )


@router.post("/auto-enviar-motorista", response_model=ProcessarResultadosResponse)
def auto_enviar_motorista(user_id: str = Depends(require_user_id), table_id: int = Depends(require_table_id)):
    """
    Envia para a coleção motorista apenas os pedidos em que Digitalizador (se exigido) está
    preenchido e "Correio de coleta ou entrega" começa com um dos prefixos configurados.
    """
    try:
        db = get_db()
        col_usuarios = db[svc.COLLECTION_USUARIOS]
        col_status = db[svc.COLLECTION_PEDIDOS_STATUS]
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao banco: {e}")

    try:
        user = col_usuarios.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None
    config = (user or {}).get("config") or {}
    if not config.get("auto_enviar_motorista_apos_import"):
        return ProcessarResultadosResponse(
            saved=0, skipped=0, rejected_tipo_bipagem=0, colecao="motorista",
            message="Envio automático está desativado. Ative em Perfil > Configurações («Enviar automaticamente para motorista após importar planilha»).",
        )
    prefixos = svc.motorista_prefixos_list(config)
    exigir_digitalizador = svc.exigir_digitalizador_motorista(config)
    if not prefixos:
        return ProcessarResultadosResponse(
            saved=0, skipped=0, rejected_tipo_bipagem=0, colecao="motorista",
            message="Configure em Perfil > Configurações os prefixos do Correio de coleta ou entrega (ex.: TAC MEI, ETC).",
        )
    svc.salvar_prefixos_motorista_no_utilizador(db, user_id, prefixos)

    q_user = {USER_ID_FIELD: user_id}
    first_status = col_status.find_one({**q_user, "isHeader": True}) or col_status.find_one(q_user, sort=[("_id", 1)])
    if not first_status:
        return ProcessarResultadosResponse(saved=0, skipped=0, rejected_tipo_bipagem=0, colecao="motorista", message="Sem dados em pedidos consultados.")
    header_status = list(first_status.get("values", []))
    idx_jms = svc.idx_numero_pedido_jms(header_status)
    idx_correio = svc.idx_coluna(header_status, "Correio de coleta ou entrega")
    idx_digitalizador = svc.idx_digitalizador(header_status)
    if idx_jms < 0:
        return ProcessarResultadosResponse(saved=0, message="Coluna 'Número de pedido JMS' não encontrada em pedidos consultados.")

    numeros_jms = []
    for doc in col_status.find({**q_user, "importDate": {"$exists": True}}):
        vals = doc.get("values") or []
        digitalizador = (vals[idx_digitalizador] if idx_digitalizador >= 0 and idx_digitalizador < len(vals) else "") or ""
        correio = (vals[idx_correio] if idx_correio >= 0 and idx_correio < len(vals) else "") or ""
        if svc.eh_motorista(digitalizador, correio, prefixos, exigir_digitalizador):
            jms = (vals[idx_jms] if idx_jms < len(vals) else "").strip() if vals else ""
            if jms:
                numeros_jms.append(jms)

    if not numeros_jms:
        return ProcessarResultadosResponse(
            saved=0, skipped=0, rejected_tipo_bipagem=0, colecao="motorista",
            message="Nenhum pedido com Digitalizador e Correio (prefixos configurados) encontrado nos dados atuais.",
        )

    result = svc.processar_e_gravar(
        db, numeros_jms, "motorista", user_id,
        motorista_prefixos=prefixos,
        motorista_exigir_digitalizador=exigir_digitalizador,
    )
    total_candidatos = len(numeros_jms)
    parts = []
    if result["saved"] > 0:
        parts.append(f"{result['saved']} gravado(s) automaticamente.")
    if result["skipped"] > 0:
        parts.append(f"{result['skipped']} já existiam.")
    if result["rejected_tipo_bipagem"] > 0:
        parts.append(f"{result['rejected_tipo_bipagem']} rejeitados (não atendem critério).")
    if result["saved"] == 0 and result["skipped"] == 0 and total_candidatos > 0:
        parts.append(
            f"{total_candidatos} atendiam o critério mas não foram gravados (verifique se já existem na lista do motorista)."
        )
    message = " ".join(parts) if parts else "Envio automático concluído."
    return ProcessarResultadosResponse(
        saved=result["saved"],
        skipped=result["skipped"],
        rejected_tipo_bipagem=result["rejected_tipo_bipagem"],
        colecao="motorista",
        message=message,
    )


def _parse_datas_query(datas: str | None) -> list[str] | None:
    """Converte query param 'datas' (ex: '2026-02-08,2026-02-09') em lista de strings YYYY-MM-DD."""
    if not datas or not str(datas).strip():
        return None
    return [d.strip() for d in str(datas).split(",") if d.strip()]


@router.get("/motorista/datas")
def listar_motorista_datas(
    user_id: str = Depends(require_user_id),
    table_id: int = Depends(require_table_id),
):
    """Retorna as datas de importação (importDate) existentes na coleção motorista, ordenadas da mais recente."""
    try:
        db = get_db()
        col = db[svc.COLLECTION_MOTORISTA]
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao banco: {e}")
    q = {USER_ID_FIELD: user_id, svc.IMPORT_DATE_FIELD: {"$exists": True}}
    raw = col.distinct(svc.IMPORT_DATE_FIELD, q)
    # Normalizar para string YYYY-MM-DD (evita TypeError ao ordenar datetime vs str)
    datas = []
    for d in raw:
        if d is None:
            continue
        try:
            if hasattr(d, "strftime"):
                datas.append(d.strftime("%Y-%m-%d"))
            else:
                s = str(d).strip()
                if len(s) >= 10:
                    datas.append(s[:10])
        except (ValueError, TypeError):
            continue
    datas = sorted(set(datas), reverse=True)
    return {"datas": datas}


def _doc_to_response_item(doc: dict) -> dict:
    """Converte doc MongoDB em item da resposta e recalcula 'Dias sem movimentação'."""
    d = {k: v for k, v in doc.items() if k != "_id"}
    d["_id"] = str(doc["_id"])
    try:
        dias = svc.dias_sem_movimentacao_motorista(doc)
        if dias is not None:
            d["Dias sem movimentação"] = dias
    except (ValueError, TypeError, AttributeError):
        pass
    c = doc.get("createdAt")
    if c:
        d["createdAt"] = c.isoformat() if hasattr(c, "isoformat") else str(c)
    return d


@router.get("/motorista", response_model=ListaMotoristaResponse)
def listar_motorista(
    page: int = 1,
    per_page: int = 100,
    datas: str | None = None,
    incluir_nao_entregues_outras_datas: bool = False,
    user_id: str = Depends(require_user_id),
    table_id: int = Depends(require_table_id),
):
    """
    Lista documentos da coleção motorista com paginação (apenas do usuário).
    Opcional ?datas=YYYY-MM-DD,... .
    Se incluir_nao_entregues_outras_datas=true: inclui também docs de outras datas com Marca de assinatura = 'Não entregue'.
    'Dias sem movimentação' é recalculado ao listar (não entregue: dias desde importDate; entregue: dias desde Tempo de digitalização).
    """
    per_page = min(max(1, per_page), 500)
    try:
        db = get_db()
        col = db[svc.COLLECTION_MOTORISTA]
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao banco: {e}")

    q_user = {USER_ID_FIELD: user_id}
    datas_list = _parse_datas_query(datas)

    if incluir_nao_entregues_outras_datas and datas_list:
        # União: docs das datas selecionadas + docs de outras datas com Marca = 'Não entregue'
        q_selected = {**q_user, svc.IMPORT_DATE_FIELD: {"$in": datas_list}}
        q_other_nao_entregues = {
            **q_user,
            svc.IMPORT_DATE_FIELD: {"$nin": datas_list},
            svc.MARCA_FIELD: svc.MARCA_NAO_ENTREGUE,
        }
        all_selected = list(col.find(q_selected, sort=[("_id", -1)]))
        all_other = list(col.find(q_other_nao_entregues, sort=[("_id", -1)]))
        seen_ids = {doc["_id"] for doc in all_selected}
        for doc in all_other:
            if doc["_id"] not in seen_ids:
                seen_ids.add(doc["_id"])
                all_selected.append(doc)
        all_selected.sort(key=lambda x: x["_id"], reverse=True)
        total = len(all_selected)
        skip = (page - 1) * per_page
        page_docs = all_selected[skip : skip + per_page]
        docs = [_doc_to_response_item(doc) for doc in page_docs]
        return ListaMotoristaResponse(data=docs, total=total)

    if datas_list:
        q_user[svc.IMPORT_DATE_FIELD] = {"$in": datas_list}
    total = col.count_documents(q_user)
    skip = (page - 1) * per_page
    cursor = col.find(q_user, sort=[("_id", -1)]).skip(skip).limit(per_page)
    docs = [_doc_to_response_item(doc) for doc in cursor]
    return ListaMotoristaResponse(data=docs, total=total)


@router.get("/motorista/numeros-jms", response_model=NumerosJmsResponse)
def listar_motorista_numeros_jms(
    datas: str | None = None,
    user_id: str = Depends(require_user_id),
    table_id: int = Depends(require_table_id),
):
    """Retorna todos os valores de 'Número de pedido JMS' da coleção motorista (apenas do usuário). Opcional ?datas=YYYY-MM-DD,..."""
    try:
        db = get_db()
        col = db[svc.COLLECTION_MOTORISTA]
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao banco: {e}")

    q_user = {USER_ID_FIELD: user_id}
    datas_list = _parse_datas_query(datas)
    if datas_list:
        q_user[svc.IMPORT_DATE_FIELD] = {"$in": datas_list}
    numeros = []
    for doc in col.find(q_user, {svc.JMS_FIELD: 1}):
        v = doc.get(svc.JMS_FIELD)
        if v is not None and str(v).strip():
            numeros.append(str(v).strip())
    return NumerosJmsResponse(numeros=numeros)


@router.post("/motorista/atualizar")
async def atualizar_motorista_por_arquivo(
    file: UploadFile = File(...),
    user_id: str = Depends(require_user_id),
    table_id: int = Depends(require_table_id),
):
    """
    Recebe um arquivo Excel (.xlsx). Para cada linha com "Número de pedido JMS" que exista
    na coleção motorista e com "Marca de assinatura" igual a valores de entrega, atualiza o documento.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo não informado.")
    ext = (file.filename or "").lower()
    if not ext.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .xlsx")

    contents = await read_upload_with_limit(file)
    try:
        rows = svc.excel_para_linhas(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler o Excel: {e}")

    if not rows:
        raise HTTPException(status_code=400, detail="O arquivo está vazio ou não tem dados na primeira planilha.")

    header = rows[0]
    idx_jms = svc.idx_numero_pedido_jms(header)
    idx_marca = svc.idx_coluna(header, "Marca de assinatura")
    if idx_jms < 0:
        raise HTTPException(status_code=400, detail='O arquivo deve ter a coluna "Número de pedido JMS".')
    if idx_marca < 0:
        raise HTTPException(status_code=400, detail='O arquivo deve ter a coluna "Marca de assinatura".')

    marcas_ok = {m.strip().lower() for m in svc.MARCA_ENTREGUE}
    try:
        db = get_db()
        col = db[svc.COLLECTION_MOTORISTA]
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao banco: {e}")

    q_user = {USER_ID_FIELD: user_id}
    updated = 0
    data_rows = rows[1:] if len(rows) > 1 else []
    for row in data_rows:
        if idx_jms >= len(row) or idx_marca >= len(row):
            continue
        numero_jms = (row[idx_jms] or "").strip()
        marca = (row[idx_marca] or "").strip().lower()
        if not numero_jms or marca not in marcas_ok:
            continue
        existing = col.find_one({**q_user, "Número de pedido JMS": numero_jms})
        if not existing:
            continue
        update_doc = svc.row_to_motorista_update(header, row)
        if not update_doc:
            continue
        # Ao marcar como entregue, atualizar importDate para hoje para contar na data atual (Performance da base)
        hoje = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        update_doc[svc.IMPORT_DATE_FIELD] = hoje
        col.update_one(
            {**q_user, "Número de pedido JMS": numero_jms},
            {"$set": update_doc},
        )
        updated += 1

    return {"updated": updated}


@router.delete("/motorista")
def limpar_motorista(user_id: str = Depends(require_user_id), table_id: int = Depends(require_table_id)):
    """Remove todos os documentos da coleção motorista (apenas do usuário)."""
    try:
        db = get_db()
        col = db[svc.COLLECTION_MOTORISTA]
        result = col.delete_many({USER_ID_FIELD: user_id})
        return {"deleted": result.deleted_count}
    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao limpar coleção: {e}")
