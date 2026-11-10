"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { StayCard } from "@/lib/types";
import { cn } from "@/lib/utils";

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: () => api<StayCard[]>("/favorites"),
    enabled: Boolean(user),
  });
}

export function FavoriteButton({ stayId, className }: { stayId: number; className?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const favs = useFavorites();
  const saved = Boolean(favs.data?.some((f) => f.id === stayId));

  const mut = useMutation({
    mutationFn: () => api(`/favorites/${stayId}`, { method: saved ? "DELETE" : "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(saved ? "از نشان‌شده‌ها برداشته شد" : "به نشان‌شده‌ها اضافه شد");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-pressed={saved}
      aria-label={saved ? "برداشتن از نشان‌شده‌ها" : "نشان کردن"}
      disabled={mut.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          toast("برای نشان کردن، اول وارد شو", {
            action: { label: "ورود", onClick: () => router.push(`/login?next=${location.pathname}`) },
          });
          return;
        }
        mut.mutate();
      }}
      className={cn("rounded-full border-ink bg-white/90 hover:bg-white", className)}
    >
      <Heart className={cn("size-4 transition", saved && "scale-110 fill-anar text-anar")} />
    </Button>
  );
}
