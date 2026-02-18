# Routers – registro centralizado para fácil inclusão de novas tabelas/rotas.
# Para adicionar um novo router: importe-o e inclua na lista ROUTERS.
# Cada entrada é (router, prefix); o prefix da API (/api) é aplicado no main.py.

from routers.auth import router as auth_router
from routers.lista_telefones import router as lista_telefones_router
from routers.importe_tabela_pedidos import router as importe_tabela_pedidos_router
from routers.importe_tabela_consulta_bipagems import router as importe_tabela_consulta_bipagems_router
from routers.pedidos_status import router as pedidos_status_router
from routers.resultados_consulta import router as resultados_consulta_router
from routers.importe_tabela_sla import router as importe_tabela_sla_router
from routers.check_update import router as check_update_router

ROUTERS = [
    (auth_router, "/api"),
    (lista_telefones_router, "/api"),
    (importe_tabela_pedidos_router, "/api"),
    (importe_tabela_consulta_bipagems_router, "/api"),
    (pedidos_status_router, "/api"),
    (resultados_consulta_router, "/api"),
    (importe_tabela_sla_router, "/api"),
    (check_update_router, "/api"),
]
