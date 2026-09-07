"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  changeOrderStatus,
  loadOrders,
  type OrderApiRecord,
} from "@/lib/orders/client";
import { orderStatusLabel, type OrderStatus } from "@/lib/orders/domain";
import { useSession } from "@/lib/useSession";

function priceLabel(order: OrderApiRecord): string {
  if (order.priceType === "ask") return "Precio por confirmar";
  if (order.priceAmount === null) return "Precio no disponible";
  const amount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(order.priceAmount);
  return order.priceType === "negotiable" ? `${amount} · negociable` : amount;
}

function statusClasses(status: OrderApiRecord["status"]): string {
  switch (status) {
    case "pending": return "bg-amber-100 text-amber-800";
    case "accepted": return "bg-sky-100 text-sky-800";
    case "ready": return "bg-violet-100 text-violet-800";
    case "completed": return "bg-emerald-100 text-emerald-800";
    case "rejected": return "bg-red-100 text-red-800";
    case "cancelled": return "bg-slate-200 text-slate-700";
  }
}

function actionsFor(order: OrderApiRecord): Array<{ status: OrderStatus; label: string; classes: string }> {
  if (order.status === "pending") {
    return [
      { status: "accepted", label: "Aceptar", classes: "bg-emerald-600 text-white hover:bg-emerald-700" },
      { status: "rejected", label: "Rechazar", classes: "border border-red-200 text-red-700 hover:bg-red-50" },
    ];
  }
  if (order.status === "accepted") {
    return [{ status: "ready", label: "Marcar listo", classes: "bg-violet-600 text-white hover:bg-violet-700" }];
  }
  if (order.status === "ready") {
    return [{ status: "completed", label: "Marcar entregado", classes: "bg-slate-900 text-white hover:bg-slate-800" }];
  }
  return [];
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<OrderApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingId, setChangingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError("");
    try {
      setOrders(await loadOrders(firebaseUser, "seller"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los pedidos recibidos.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    void refresh();
  }, [firebaseUser, refresh, router, sessionLoading]);

  async function change(orderId: string, status: OrderStatus) {
    if (!firebaseUser || changingId) return;
    setChangingId(orderId);
    setError("");
    try {
      const updated = await changeOrderStatus(firebaseUser, orderId, status);
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "No se pudo actualizar el pedido.");
    } finally {
      setChangingId(null);
    }
  }

  if (sessionLoading || !firebaseUser) {
    return <main className="min-h-screen bg-slate-100 p-5">Comprobando sesión...</main>;
  }

  const pendingCount = orders.filter((order) => order.status === "pending").length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-300">Ventas</p>
              <h1 className="mt-2 text-3xl font-black">Pedidos recibidos</h1>
              <p className="mt-2 text-sm text-slate-300">
                {pendingCount > 0 ? `${pendingCount} pedido(s) esperando respuesta.` : "No tienes pedidos pendientes de respuesta."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/mystore" className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950">Mis tiendas</Link>
              <Link href="/marketplace" className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-black text-white">Mercadito</Link>
            </div>
          </div>
        </header>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</div>}

        {loading ? (
          <section className="rounded-3xl bg-white p-6 text-slate-600 shadow-sm">Cargando pedidos...</section>
        ) : orders.length === 0 ? (
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="text-4xl" aria-hidden="true">📥</div>
            <h2 className="mt-3 text-xl font-black text-slate-900">Aún no has recibido pedidos</h2>
            <p className="mt-2 text-sm text-slate-600">Cuando alguien solicite un producto de una de tus tiendas aparecerá aquí.</p>
          </section>
        ) : (
          <section className="space-y-4">
            {orders.map((order) => {
              const actions = actionsFor(order);
              return (
                <article key={order.id} className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 md:flex-row">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      {order.productImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={order.productImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl" aria-hidden="true">📦</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-sky-700">{order.storeName}</p>
                          <h2 className="mt-1 text-xl font-black text-slate-950">{order.productTitle}</h2>
                          <p className="mt-1 text-sm font-semibold text-slate-600">Comprador: {order.buyerDisplayName}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses(order.status)}`}>
                          {orderStatusLabel(order.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p><strong className="text-slate-800">Cantidad:</strong> {order.quantity}</p>
                        <p><strong className="text-slate-800">Precio:</strong> {priceLabel(order)}</p>
                        {order.deliveryLocation && <p className="sm:col-span-2"><strong className="text-slate-800">Punto de entrega:</strong> {order.deliveryLocation}</p>}
                        {order.note && <p className="sm:col-span-2 rounded-xl bg-slate-50 p-3"><strong className="text-slate-800">Nota:</strong> {order.note}</p>}
                        <p className="sm:col-span-2 text-xs text-slate-500">Recibido {new Date(order.createdAt).toLocaleString("es-MX")}</p>
                      </div>

                      {actions.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {actions.map((action) => (
                            <button
                              key={action.status}
                              type="button"
                              disabled={changingId === order.id}
                              onClick={() => void change(order.id, action.status)}
                              className={`rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-50 ${action.classes}`}
                            >
                              {changingId === order.id ? "Actualizando..." : action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
