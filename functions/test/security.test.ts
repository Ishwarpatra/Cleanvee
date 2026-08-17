import { escapeHtml } from '../src/notificationSecurity';
import { isValidCleaningLog, parseFeedback } from '../src/validation';

describe('security boundaries', () => {
  it('escapes HTML metacharacters in notification content', () => {
    expect(escapeHtml(`<script>alert('x')</script> & "quoted"`)).toBe(
      '&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quoted&quot;',
    );
  });

  it('accepts bounded feedback with an allowed issue type', () => {
    expect(parseFeedback({
      checkpoint_id: 'checkpoint-1',
      building_id: 'building-1',
      type: 'DIRTY',
      details: 'Visible dirt near the entrance',
      submitted_by: 'user-1',
    })).toEqual({
      checkpoint_id: 'checkpoint-1',
      building_id: 'building-1',
      type: 'DIRTY',
      details: 'Visible dirt near the entrance',
      submitted_by: 'user-1',
    });
  });

  it('rejects oversized or unapproved feedback', () => {
    expect(parseFeedback({
      checkpoint_id: 'checkpoint-1',
      building_id: 'building-1',
      type: 'SCRIPT',
      details: 'x',
      submitted_by: 'user-1',
    })).toBeNull();

    expect(parseFeedback({
      checkpoint_id: 'checkpoint-1',
      building_id: 'building-1',
      type: 'OTHER',
      details: 'x'.repeat(1001),
      submitted_by: 'user-1',
    })).toBeNull();
  });

  it('rejects malformed cleaning logs and accepts bounded valid logs', () => {
    expect(isValidCleaningLog({
      building_id: 'building-1',
      checkpoint_id: 'checkpoint-1',
      cleaner_id: 'cleaner-1',
      created_at: '2026-08-17T12:00:00.000Z',
      proof_of_quality: {
        overall_score: 92,
        detected_objects: [{ label: 'floor', confidence: 0.99 }],
      },
      verification_result: { status: 'verified' },
    })).toBe(true);

    expect(isValidCleaningLog({
      building_id: 'building-1',
      checkpoint_id: 'checkpoint-1',
      cleaner_id: 'cleaner-1',
      created_at: 'not-a-date',
    })).toBe(false);
  });
});
