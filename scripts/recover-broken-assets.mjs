/**
 * Recover 42 broken featured images for colombiatours.travel
 *
 * Strategy per URL:
 *  1. Try WordPress source: colombiatours.travel/wp-content/uploads/{path}
 *  2. Fallback: Wayback Machine latest snapshot
 *  3. If unrecoverable: null out featured_image in website_blog_posts
 *
 * Re-uploads to the SAME Supabase path → no DB URL updates needed.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzlxbpicdcdvxvdcvgas.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const BUCKET = 'images';
const WP_BASE = 'https://colombiatours.travel/wp-content/uploads';
const WAYBACK_API = 'https://archive.org/wayback/available?url=';

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// 42 unique broken paths from issue #103
const BROKEN_PATHS = [
  '2015/08/banner-entradas-blog-3.jpg',
  '2016/12/COLOMBIA-TOURS.png',
  '2017/04/Termales-San-Vicente-2.jpg',
  '2017/04/Turismo-Sostenible.png',
  '2017/04/vacunacion_5-1.jpg',
  '2017/05/Día-de-la-Madre-Viajes-para-Mamás-Mamá-Colombia-Tours-Travel.jpeg',
  '2017/06/Copia-de-Copia-de-Naranja-Amarillo-Grafico-Ilustrado-Promocion-de-Cumpleanos-Portada-de-Facebook.png',
  '2017/06/PORTADA-BLOG-2.png',
  '2017/06/spectacled-bear-857433_1920.jpg',
  '2017/06/Termales-de-San-Vicente-Santa-Rosa-de-Cabal-Eje-Cafetero-Colombia-Reserva-Natural-8.jpg',
  '2017/07/sanand.jpg',
  '2017/07/WhatsApp-Image-2018-07-04-at-12.17.27-PM.jpeg',
  '2018/02/Rocas_de_Río_y_Relieve_en_el_Desierto_de_La_Tatacoa.jpg',
  '2018/04/WhatsApp-Image-2018-04-23-at-12.03.21-PM.jpeg',
  '2018/04/WhatsApp-Image-2018-04-23-at-5.35.24-PM-7.jpeg',
  '2018/06/Barichara-y-San-Gil-Turismo-de-Colombia-Santander-Sitios-Turísticos-Cosas-que-hacer-en-Barichara-2.jpg',
  '2018/08/4081596290_5ccb708d7d_b.jpg',
  '2018/11/20180328_092022.jpg',
  '2018/12/guatape_3_1.jpg',
  '2018/12/medellin-2429413_960_720.jpg',
  '2018/12/Tour-de-Luces-Medellín-Alumbrado-Navideño-Colombia-Plan-Turístico-9.jpeg',
  '2019/03/f193f086-paisaje-cultural-cafetero-tour-del-café-altagracia-la-divisa-de-don-juan-eje-cafetero-colombia-turismo.jpeg',
  '2019/10/Aeropuerto-Bogotá-el-Dorado.png',
  '2019/10/Fotografías-Procolombia-2019-10.jpeg',
  '2019/10/Fotografías-Procolombia-2019-17.jpeg',
  '2019/12/Estafas-en-Turismo.png',
  '2020/02/La-Lucha-Femenina-a-través-de-la-Historia.png',
  '2020/02/Peliculas-y-series-de-Mujeres.jpg',
  '2020/11/airport-731196_1920.jpg',
  '2021/02/timothy-meinberg-AL2-t0GrSko-unsplash.jpg',
  '2021/03/Lost_City_Ruins.jpg',
  '2021/03/¿Por-que-mola-viajar-a-Colombia-en-el-2022-1.png',
  '2021/04/Mal-de-Montana.jpg',
  '2021/05/litorial-pacifico-colombiano.png',
  '2021/10/10-Razones-para-Viajar-a-1.png',
  '2021/12/10-Razones-para-Viajar-a-7.png',
  '2021/12/WhatsApp-Image-2022-01-13-at-4.58.37-PM.jpeg',
  '2022/03/Naranja-Amarillo-Grafico-Ilustrado-Promocion-de-Cumpleanos-Portada-de-Facebook2.png',
  '2022/04/10-Razones-para-Viajar-a-1.png',
  '2022/09/Viaja-a-Colombia-desde-Panama-1.png',
  '2022/12/Copia-de-Viaja-a-Colombia-desde-Panama.png',
  '2025/09/MALETA.jpg',
];

async function tryFetch(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const ct = res.headers.get('content-type') ?? 'application/octet-stream';
      if (!ct.startsWith('image/')) return null;
      return { buffer: Buffer.from(buf), contentType: ct };
    }
    return null;
  } catch {
    return null;
  }
}

async function tryWayback(originalUrl) {
  try {
    const apiUrl = `${WAYBACK_API}${encodeURIComponent(originalUrl)}&output=json`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const snapshot = data?.archived_snapshots?.closest;
    if (!snapshot?.available || !snapshot?.url) return null;
    // Use raw snapshot (id_ prefix preserves original response headers)
    const rawUrl = snapshot.url.replace('/web/', '/web/id_/');
    return tryFetch(rawUrl);
  } catch {
    return null;
  }
}

async function uploadToSupabase(storagePath, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  return !error;
}

async function nullOutFeaturedImage(supabasePath) {
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${supabasePath}`;
  const { error } = await supabase
    .from('website_blog_posts')
    .update({ featured_image: null })
    .eq('website_id', WEBSITE_ID)
    .eq('featured_image', publicUrl);
  if (error) console.error(`  DB null-out error: ${error.message}`);
}

async function updateMediaAssetStatus(supabasePath, status) {
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${supabasePath}`;
  await supabase
    .from('media_assets')
    .update({ http_status: status, last_verified_at: new Date().toISOString() })
    .eq('public_url', publicUrl)
    .eq('website_id', WEBSITE_ID);
}

async function main() {
  const results = { recovered_wp: [], recovered_wayback: [], lost: [] };

  for (const relPath of BROKEN_PATHS) {
    const storagePath = `colombiatours/library/${relPath}`;
    const wpUrl = `${WP_BASE}/${relPath}`;
    const supabasePublicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    process.stdout.write(`[${relPath}] `);

    // 1. Try WordPress source
    let fetched = await tryFetch(wpUrl);
    if (fetched) {
      const ok = await uploadToSupabase(storagePath, fetched.buffer, fetched.contentType);
      if (ok) {
        await updateMediaAssetStatus(storagePath, 200);
        results.recovered_wp.push(relPath);
        console.log('✓ WP');
        continue;
      }
    }

    // 2. Try Wayback Machine
    fetched = await tryWayback(supabasePublicUrl);
    if (fetched) {
      const ok = await uploadToSupabase(storagePath, fetched.buffer, fetched.contentType);
      if (ok) {
        await updateMediaAssetStatus(storagePath, 200);
        results.recovered_wayback.push(relPath);
        console.log('✓ Wayback');
        continue;
      }
    }

    // 3. Unrecoverable — null out featured_image
    await nullOutFeaturedImage(storagePath);
    await updateMediaAssetStatus(storagePath, 404);
    results.lost.push(relPath);
    console.log('✗ LOST — featured_image nulled');
  }

  console.log('\n=== RECOVERY SUMMARY ===');
  console.log(`Recovered from WordPress: ${results.recovered_wp.length}`);
  console.log(`Recovered from Wayback:   ${results.recovered_wayback.length}`);
  console.log(`Permanently lost (nulled): ${results.lost.length}`);

  if (results.lost.length > 0) {
    console.log('\nLost paths:');
    results.lost.forEach(p => console.log(`  - ${p}`));
  }

  return results;
}

main().catch(console.error);
