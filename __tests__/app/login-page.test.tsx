import LoginPage from '@/app/(auth)/login/page';
import { LoginForm } from '@/app/(auth)/login/login-form';

jest.mock('@/app/(auth)/login/login-form', () => ({
  LoginForm: jest.fn(() => null),
}));

describe('/login redirect handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('honors next from protected route redirects before the legacy redirect param', async () => {
    const element = await LoginPage({
      searchParams: Promise.resolve({
        next: '/admin/prototype/planner-workbench',
        redirect: '/dashboard',
      }),
    });

    expect(element).toEqual(
      expect.objectContaining({
        type: LoginForm,
        props: { redirect: '/admin/prototype/planner-workbench' },
      }),
    );
  });

  it('keeps redirect as the fallback parameter', async () => {
    const element = await LoginPage({
      searchParams: Promise.resolve({ redirect: '/dashboard/example' }),
    });

    expect(element).toEqual(
      expect.objectContaining({
        type: LoginForm,
        props: { redirect: '/dashboard/example' },
      }),
    );
  });
});
