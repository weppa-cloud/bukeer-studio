import AdminLayout from '@/app/admin/layout';

describe('/admin layout Evolución contract', () => {
  it('loads Evolución fonts and exposes theme variables to admin portals', () => {
    const element = AdminLayout({ children: <div data-testid="child" /> });
    const children = element.props.children;
    const [fontStyle, themeStyle, wrapper] = children;

    expect(fontStyle.props.id).toBe('admin-next-evolucion-fonts');
    expect(fontStyle.props.dangerouslySetInnerHTML.__html).toContain('Readex+Pro');
    expect(fontStyle.props.dangerouslySetInnerHTML.__html).toContain('Outfit');

    const themeCss = themeStyle.props.dangerouslySetInnerHTML.__html;
    expect(themeStyle.props.id).toBe('admin-next-evolucion-theme');
    expect(themeCss).toContain(':root,\nbody,\n.bukeer-admin-signature');
    expect(themeCss).not.toContain(':has(');
    expect(themeCss).toContain('--font-heading');
    expect(themeCss).toContain('--bukeer-surface-rail');

    expect(wrapper.props.className).toBe('bukeer-admin-signature');
  });
});
