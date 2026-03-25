import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get("/users?limit=200&role=customer");
      return data;
    },
  });
}