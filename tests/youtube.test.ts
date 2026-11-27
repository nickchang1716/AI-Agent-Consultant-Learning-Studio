import { describe, expect, it } from 'vitest';
import { formatTime, isSafeHttpUrl, isSearchUrl, parseYouTubeId } from '../src/lib/youtube';

describe('youtube', () => {
  it('解析三種 URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=qYNweeDHiyU')).toBe('qYNweeDHiyU');
    expect(parseYouTubeId('https://youtu.be/LPZh9BOjkQs?t=10')).toBe('LPZh9BOjkQs');
    expect(parseYouTubeId('https://www.youtube.com/embed/OhI005_aJkA')).toBe('OhI005_aJkA');
  });

  it('搜尋頁與非 YouTube 回傳 null', () => {
    expect(parseYouTubeId('https://www.youtube.com/results?search_query=x')).toBeNull();
    expect(parseYouTubeId('https://example.com/watch?v=qYNweeDHiyU')).toBeNull();
    expect(parseYouTubeId('not a url')).toBeNull();
    expect(isSearchUrl('https://www.youtube.com/results?search_query=x')).toBe(true);
    expect(isSearchUrl('https://youtube.com/results?search_query=x')).toBe(true);
    expect(isSearchUrl('https://notyoutube.com/results?search_query=x')).toBe(false);
    expect(isSearchUrl('https://evil.com/youtube.com/results')).toBe(false);
  });

  it('只允許 http(s)', () => {
    expect(isSafeHttpUrl('https://a.com')).toBe(true);
    expect(isSafeHttpUrl('http://a.com')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,hi')).toBe(false);
    expect(parseYouTubeId('javascript:alert(1)')).toBeNull();
  });

  it('formatTime', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(-5)).toBe('00:00');
  });
});
