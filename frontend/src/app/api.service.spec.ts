import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { readableError } from './api.service';

describe('readableError', () => {
  it('shows a clear message when the backend cannot be reached', () => {
    expect(readableError(new HttpErrorResponse({ status: 0 }))).toContain('could not reach');
  });

  it('uses the API validation message when a vote is rejected', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { detail: 'You have already voted in this election.' },
    });
    expect(readableError(error)).toBe('You have already voted in this election.');
  });
});
