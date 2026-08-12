// File: src/app/services/hooks.ts
// Description: Typed React-Redux hooks for use throughout the application.
// Author: Akilan M
// Created: 2026-08-12T14:27:30+05:30

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
