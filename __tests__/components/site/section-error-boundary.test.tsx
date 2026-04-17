import React from 'react';

import { SectionErrorBoundary } from '@/components/site/section-error-boundary';

describe('SectionErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders nothing and logs section context when a child throws', () => {
    const thrownError = new Error('section failed');

    function ThrowingSection(): never {
      throw thrownError;
    }

    expect(() => ThrowingSection()).toThrow(thrownError);

    const boundary = new SectionErrorBoundary({
      sectionName: 'hero',
      children: React.createElement(ThrowingSection),
    });

    boundary.state = SectionErrorBoundary.getDerivedStateFromError(thrownError);
    boundary.componentDidCatch(thrownError, {
      componentStack: '\n    at ThrowingSection',
    } as React.ErrorInfo);

    expect(boundary.render()).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[product.section-error]',
      'hero',
      thrownError,
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );
  });
});
