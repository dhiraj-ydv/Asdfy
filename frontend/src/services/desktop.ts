import { invoke } from '@tauri-apps/api/core';
import { createClient } from './client';

export const desktop = createClient(invoke);
