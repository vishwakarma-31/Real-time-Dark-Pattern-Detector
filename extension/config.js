// Runtime API/WS config for extension requests.
// TODO: Replace YOUR_ACTUAL_DOMAIN placeholders before production deployment.
// For local testing only, temporarily set IS_DEV=true and revert before committing.
const DARKSCAN_CONFIG = {
  PROD_API_URL: 'https://YOUR_ACTUAL_DOMAIN/api/v1/analyze',
  PROD_WS_URL: 'wss://YOUR_ACTUAL_DOMAIN/ws',
  PROD_DASHBOARD_URL: 'https://YOUR_ACTUAL_DOMAIN',
  DEV_API_URL: 'http://localhost:5000/api/v1/analyze',
  DEV_WS_URL: 'ws://localhost:5000/ws',
  DEV_DASHBOARD_URL: 'http://localhost:5000',
  IS_DEV: false
};
const API_URL = DARKSCAN_CONFIG.IS_DEV ? DARKSCAN_CONFIG.DEV_API_URL : DARKSCAN_CONFIG.PROD_API_URL;
const WS_URL = DARKSCAN_CONFIG.IS_DEV ? DARKSCAN_CONFIG.DEV_WS_URL : DARKSCAN_CONFIG.PROD_WS_URL;
const DASHBOARD_URL = DARKSCAN_CONFIG.IS_DEV ? DARKSCAN_CONFIG.DEV_DASHBOARD_URL : DARKSCAN_CONFIG.PROD_DASHBOARD_URL;
