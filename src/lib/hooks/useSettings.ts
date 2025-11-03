import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../api';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.get(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsAPI.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useUpdateShopInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsAPI.updateShopInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useUpdateTaxConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsAPI.updateTaxConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useUpdateMetalRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsAPI.updateMetalRates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useUpdateProductTypes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsAPI.updateProductTypes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useResetSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsAPI.reset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
