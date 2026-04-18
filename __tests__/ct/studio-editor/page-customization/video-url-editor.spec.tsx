import { test, expect } from '@playwright/experimental-ct-react';
import { VideoUrlEditor } from '@/components/admin/page-customization/video-url-editor';

test.describe('<VideoUrlEditor>', () => {
  test('empty — campos vacíos, sin badge de proveedor', async ({ mount }) => {
    const c = await mount(
      <VideoUrlEditor productId="p-1" videoUrl={null} videoCaption={null} />,
    );
    await expect(c.getByLabel(/url del video/i)).toHaveValue('');
    await expect(c.getByText(/proveedor:/i)).toHaveCount(0);
  });

  test('filled — YouTube URL muestra badge', async ({ mount }) => {
    const c = await mount(
      <VideoUrlEditor
        productId="p-1"
        videoUrl="https://youtube.com/watch?v=dQw4w9WgXcQ"
        videoCaption="Así se vive"
      />,
    );
    await expect(c.getByLabel(/proveedor: youtube/i)).toBeVisible();
    await expect(c.getByLabel(/título del video/i)).toHaveValue('Así se vive');
  });

  test('filled — Vimeo URL muestra badge', async ({ mount }) => {
    const c = await mount(
      <VideoUrlEditor productId="p-1" videoUrl="https://vimeo.com/123456789" videoCaption={null} />,
    );
    await expect(c.getByLabel(/proveedor: vimeo/i)).toBeVisible();
  });

  test('filled — URL externa muestra warning', async ({ mount }) => {
    const c = await mount(
      <VideoUrlEditor
        productId="p-1"
        videoUrl="https://example.com/page"
        videoCaption={null}
      />,
    );
    await expect(c.getByRole('alert')).toContainText(/url no reconocida/i);
  });

  test('readOnly — banner de solo lectura', async ({ mount }) => {
    const c = await mount(
      <VideoUrlEditor productId="p-1" videoUrl="https://youtu.be/abc" videoCaption={null} readOnly />,
    );
    await expect(c.getByRole('alert')).toContainText(/solo lectura/i);
  });

  test('visual — empty', async ({ mount }) => {
    const c = await mount(
      <VideoUrlEditor productId="p-1" videoUrl={null} videoCaption={null} />,
    );
    await expect(c).toHaveScreenshot('video-url-editor-empty.png');
  });

  test('visual — youtube filled', async ({ mount }) => {
    const c = await mount(
      <VideoUrlEditor
        productId="p-1"
        videoUrl="https://youtube.com/watch?v=dQw4w9WgXcQ"
        videoCaption="Así se vive el tour"
      />,
    );
    await expect(c).toHaveScreenshot('video-url-editor-youtube.png');
  });

  test('visual — external warning', async ({ mount }) => {
    const c = await mount(
      <VideoUrlEditor productId="p-1" videoUrl="https://example.com/video" videoCaption={null} />,
    );
    await expect(c).toHaveScreenshot('video-url-editor-external.png');
  });
});
