/**
 * URL base da API Quarkus. Frontend e backend rodam em origens diferentes tanto local
 * (:4200 vs :8080, AD-7) quanto em produção (Render Static Site vs Web Service, AD-6) —
 * comunicação sempre cross-origin via CORS liberado centralmente no backend, nunca proxy
 * same-origin. O valor vem de src/environments (o build de produção troca o arquivo).
 */
import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;
