import '@/app/globals.css';
import { beforeMount } from '@playwright/experimental-ct-react/hooks';

beforeMount(async () => {
  document.documentElement.classList.remove('dark');
  document.body.style.margin = '0';
});
