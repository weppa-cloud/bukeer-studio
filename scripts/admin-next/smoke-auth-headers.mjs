export const adminNextSmokeToken =
  process.env.ADMIN_NEXT_PROTOTYPE_SMOKE_TOKEN || 'local-admin-next-smoke';

export function adminNextSmokeHeaders(extraHeaders = {}) {
  return {
    ...extraHeaders,
    'x-admin-next-smoke-token': adminNextSmokeToken,
  };
}

export async function newAdminNextSmokePage(browser, targetUrl, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addCookies([
    {
      name: 'admin_next_smoke_token',
      value: adminNextSmokeToken,
      url: new URL(targetUrl).origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  return context.newPage();
}
