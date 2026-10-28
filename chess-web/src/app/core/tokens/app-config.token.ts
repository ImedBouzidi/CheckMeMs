import { InjectionToken } from '@angular/core';
import { AppConfig } from '../config/app-config';

export const APP_CONFIG_TOKEN = new InjectionToken<AppConfig>('APP_CONFIG');
