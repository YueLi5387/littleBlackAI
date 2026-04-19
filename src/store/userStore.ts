import { immer } from "zustand/middleware/immer";
import { create } from "zustand";
import { createJSONStorage, devtools } from "zustand/middleware";
import { persist } from "zustand/middleware";
import { UserStoreType } from "@/lib/types/userStoreType";
import { User } from "@/lib/types/userStoreType";

export const useUserStore = create<UserStoreType>()(
  immer(
    devtools(
      persist(
        (set, get) => {
          return {
            user: null,
            setUser: (value: User) => {
              set((state) => {
                state.user = value;
              });
            },
            getUser: (): User | null => {
              return get().user;
            },
          };
        },
        {
          name: "userStore",
          storage: createJSONStorage(() => localStorage),
        },
      ),
    ),
  ),
);
