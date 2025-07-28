import { create } from 'zustand';

interface SubscriptionState {
  isCheckingSubscription: boolean;
  setIsCheckingSubscription: (isChecking: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isCheckingSubscription: false,
  setIsCheckingSubscription: (isChecking: boolean) =>
    set({ isCheckingSubscription: isChecking }),
}));
