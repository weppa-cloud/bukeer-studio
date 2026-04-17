'use client';

import React from 'react';

export interface SectionErrorBoundaryProps {
  sectionName: string;
  children?: React.ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

const SECTION_ERROR_PREFIX = '[product.section-error]';

export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(_error: Error): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(SECTION_ERROR_PREFIX, this.props.sectionName, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children ?? null;
  }
}
