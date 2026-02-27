import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.suascompras.mercado',
  appName: 'Suas Compras de Mercado',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
