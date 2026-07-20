"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { StarInput } from "@/components/ui/StarInput";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { createReview, updateReview, respondToReview } from "@/app/productos/[id]/reviews/actions";
import type { ReviewWithReviewer } from "@/types/database";

type UnreviewedOrder = { id: number; product_title: string };

type Props = {
  reviews: ReviewWithReviewer[];
  sellerId: string;
  productId: number;
  currentUserId: string | null;
  isOwner: boolean;
  unreviewedOrders: UnreviewedOrder[];
  reviewOk: boolean;
  reviewError: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ReviewsSection({
  reviews,
  sellerId,
  productId,
  currentUserId,
  isOwner,
  unreviewedOrders,
  reviewOk,
  reviewError,
}: Props) {
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [editingReview, setEditingReview] = useState<number | null>(null);

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="mb-5 font-display text-lg font-semibold text-ink">
        Reseñas del vendedor{reviews.length > 0 && ` (${reviews.length})`}
      </h2>

      {reviewOk && <Alert variant="ok">¡Tu reseña fue publicada!</Alert>}
      {reviewError && <Alert variant="err">{reviewError}</Alert>}

      {reviews.length === 0 && (
        <p className="mb-6 text-sm text-ink-soft">Este vendedor todavía no tiene reseñas.</p>
      )}

      <ul className="flex flex-col gap-6">
        {reviews.map((review) => {
          const isMyReview = currentUserId === review.reviewer_id;
          const isEditing = editingReview === review.id;
          const isResponding = respondingTo === review.id;

          return (
            <li key={review.id} className="rounded-lg border border-border p-4">
              {/* Encabezado: avatar + nombre + estrellas + fecha */}
              <div className="flex items-start gap-3">
                <Avatar
                  avatarPath={review.reviewer?.avatar_url ?? null}
                  initial={(review.reviewer?.username ?? "?")[0]!.toUpperCase()}
                  alt=""
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">
                      {review.reviewer?.username
                        ? `@${review.reviewer.username}`
                        : "Usuario"}
                    </span>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  <p className="text-xs text-ink-soft">{formatDate(review.created_at)}</p>
                </div>
                {isMyReview && !isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReview(review.id);
                      setRespondingTo(null);
                    }}
                    className="shrink-0 text-xs text-ink-soft underline hover:text-ink"
                  >
                    Editar
                  </button>
                )}
              </div>

              {/* Comentario del comprador */}
              {!isEditing && review.comment && (
                <p className="mt-3 text-sm text-ink-soft">{review.comment}</p>
              )}

              {/* Formulario de edición (comprador) */}
              {isEditing && (
                <form action={updateReview} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="review_id" value={review.id} />
                  <input type="hidden" name="product_id" value={productId} />
                  <StarInput name="rating" defaultValue={review.rating} />
                  <Textarea
                    name="comment"
                    label="Comentario (opcional)"
                    defaultValue={review.comment ?? ""}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Guardar</Button>
                    <button
                      type="button"
                      onClick={() => setEditingReview(null)}
                      className="text-sm text-ink-soft hover:text-ink"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* Respuesta del vendedor */}
              {review.seller_response && !isResponding && (
                <div className="mt-3 rounded-md bg-bg-subtle px-3 py-2">
                  <p className="mb-1 text-xs font-semibold text-ink-soft">Respuesta del vendedor</p>
                  <p className="text-sm text-ink-soft">{review.seller_response}</p>
                </div>
              )}

              {/* Botón "Responder" (solo vendedor, solo si no hay respuesta) */}
              {isOwner && !review.seller_response && !isResponding && (
                <button
                  type="button"
                  onClick={() => {
                    setRespondingTo(review.id);
                    setEditingReview(null);
                  }}
                  className="mt-3 text-xs text-ink-soft underline hover:text-ink"
                >
                  Responder
                </button>
              )}

              {/* Formulario de respuesta (vendedor) */}
              {isResponding && (
                <form action={respondToReview} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="review_id" value={review.id} />
                  <input type="hidden" name="product_id" value={productId} />
                  <Textarea
                    name="seller_response"
                    label="Tu respuesta"
                    rows={3}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Publicar respuesta</Button>
                    <button
                      type="button"
                      onClick={() => setRespondingTo(null)}
                      className="text-sm text-ink-soft hover:text-ink"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {/* Formularios de nueva reseña (una por orden pendiente) */}
      {unreviewedOrders.length > 0 && (
        <div className="mt-8 flex flex-col gap-6">
          <h3 className="font-display text-base font-semibold text-ink">Dejá tu reseña</h3>
          {unreviewedOrders.map((order) => (
            <form
              key={order.id}
              action={createReview}
              className="rounded-lg border border-border p-4 flex flex-col gap-3"
            >
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="seller_id" value={sellerId} />
              <input type="hidden" name="product_id" value={productId} />
              <p className="text-xs text-ink-soft">
                Compra: <span className="font-medium text-ink">{order.product_title}</span>
              </p>
              <StarInput name="rating" />
              <Textarea
                name="comment"
                label="Comentario (opcional)"
                rows={3}
              />
              <Button type="submit" size="sm">Publicar reseña</Button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
