/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  fileToPath,
  genChunkName,
  isValidPathname,
  addTrailingSlash,
  removeTrailingSlash,
  removeSuffix,
  removePrefix,
  addLeadingSlash,
  getElementsAround,
  mergeTranslations,
  mapAsyncSequential,
  findAsyncSequential,
  updateTranslationFileMessages,
  parseMarkdownHeadingId,
} from '../index';
import {sum} from 'lodash';

describe('load utils', () => {
  test('fileToPath', () => {
    const asserts: Record<string, string> = {
      'index.md': '/',
      'hello/index.md': '/hello/',
      'foo.md': '/foo',
      'foo/bar.md': '/foo/bar',
      'index.js': '/',
      'hello/index.js': '/hello/',
      'foo.js': '/foo',
      'foo/bar.js': '/foo/bar',
    };
    Object.keys(asserts).forEach((file) => {
      expect(fileToPath(file)).toBe(asserts[file]);
    });
  });

  test('genChunkName', () => {
    const firstAssert: Record<string, string> = {
      '/docs/adding-blog': 'docs-adding-blog-062',
      '/docs/versioning': 'docs-versioning-8a8',
      '/': 'index',
      '/blog/2018/04/30/How-I-Converted-Profilo-To-Docusaurus':
        'blog-2018-04-30-how-i-converted-profilo-to-docusaurus-4f2',
      '/youtube': 'youtube-429',
      '/users/en/': 'users-en-f7a',
      '/blog': 'blog-c06',
    };
    Object.keys(firstAssert).forEach((str) => {
      expect(genChunkName(str)).toBe(firstAssert[str]);
    });

    // Don't allow different chunk name for same path.
    expect(genChunkName('path/is/similar', 'oldPrefix')).toEqual(
      genChunkName('path/is/similar', 'newPrefix'),
    );

    // Even with same preferred name, still different chunk name for different path
    const secondAssert: Record<string, string> = {
      '/blog/1': 'blog-85-f-089',
      '/blog/2': 'blog-353-489',
    };
    Object.keys(secondAssert).forEach((str) => {
      expect(genChunkName(str, undefined, 'blog')).toBe(secondAssert[str]);
    });

    // Only generate short unique id
    const thirdAssert: Record<string, string> = {
      a: '0cc175b9',
      b: '92eb5ffe',
      c: '4a8a08f0',
      d: '8277e091',
    };
    Object.keys(thirdAssert).forEach((str) => {
      expect(genChunkName(str, undefined, undefined, true)).toBe(
        thirdAssert[str],
      );
    });
    expect(genChunkName('d', undefined, undefined, true)).toBe('8277e091');
  });

  test('isValidPathname', () => {
    expect(isValidPathname('/')).toBe(true);
    expect(isValidPathname('/hey')).toBe(true);
    expect(isValidPathname('/hey/ho')).toBe(true);
    expect(isValidPathname('/hey/ho/')).toBe(true);
    expect(isValidPathname('/hey/h%C3%B4/')).toBe(true);
    expect(isValidPathname('/hey///ho///')).toBe(true); // Unexpected but valid
    expect(isValidPathname('/hey/héllô you')).toBe(true);

    //
    expect(isValidPathname('')).toBe(false);
    expect(isValidPathname('hey')).toBe(false);
    expect(isValidPathname('/hey?qs=ho')).toBe(false);
    expect(isValidPathname('https://fb.com/hey')).toBe(false);
    expect(isValidPathname('//hey')).toBe(false);
  });
});

describe('addTrailingSlash', () => {
  test('should no-op', () => {
    expect(addTrailingSlash('/abcd/')).toEqual('/abcd/');
  });
  test('should add /', () => {
    expect(addTrailingSlash('/abcd')).toEqual('/abcd/');
  });
});

describe('addLeadingSlash', () => {
  test('should no-op', () => {
    expect(addLeadingSlash('/abc')).toEqual('/abc');
  });
  test('should add /', () => {
    expect(addLeadingSlash('abc')).toEqual('/abc');
  });
});

describe('removeTrailingSlash', () => {
  test('should no-op', () => {
    expect(removeTrailingSlash('/abcd')).toEqual('/abcd');
  });
  test('should remove /', () => {
    expect(removeTrailingSlash('/abcd/')).toEqual('/abcd');
  });
});

describe('removeSuffix', () => {
  test('should no-op 1', () => {
    expect(removeSuffix('abcdef', 'ijk')).toEqual('abcdef');
  });
  test('should no-op 2', () => {
    expect(removeSuffix('abcdef', 'abc')).toEqual('abcdef');
  });
  test('should no-op 3', () => {
    expect(removeSuffix('abcdef', '')).toEqual('abcdef');
  });
  test('should remove suffix', () => {
    expect(removeSuffix('abcdef', 'ef')).toEqual('abcd');
  });
});

describe('removePrefix', () => {
  test('should no-op 1', () => {
    expect(removePrefix('abcdef', 'ijk')).toEqual('abcdef');
  });
  test('should no-op 2', () => {
    expect(removePrefix('abcdef', 'def')).toEqual('abcdef');
  });
  test('should no-op 3', () => {
    expect(removePrefix('abcdef', '')).toEqual('abcdef');
  });
  test('should remove prefix', () => {
    expect(removePrefix('abcdef', 'ab')).toEqual('cdef');
  });
});

describe('getElementsAround', () => {
  test('can return elements around', () => {
    expect(getElementsAround(['a', 'b', 'c', 'd'], 0)).toEqual({
      previous: undefined,
      next: 'b',
    });
    expect(getElementsAround(['a', 'b', 'c', 'd'], 1)).toEqual({
      previous: 'a',
      next: 'c',
    });
    expect(getElementsAround(['a', 'b', 'c', 'd'], 2)).toEqual({
      previous: 'b',
      next: 'd',
    });
    expect(getElementsAround(['a', 'b', 'c', 'd'], 3)).toEqual({
      previous: 'c',
      next: undefined,
    });
  });

  test('throws if bad index is provided', () => {
    expect(() =>
      getElementsAround(['a', 'b', 'c', 'd'], -1),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Valid \\"aroundIndex\\" for array (of size 4) are between 0 and 3, but you provided -1."`,
    );
    expect(() =>
      getElementsAround(['a', 'b', 'c', 'd'], 4),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Valid \\"aroundIndex\\" for array (of size 4) are between 0 and 3, but you provided 4."`,
    );
  });
});

describe('mergeTranslations', () => {
  test('should merge translations', () => {
    expect(
      mergeTranslations([
        {
          T1: {message: 'T1 message', description: 'T1 desc'},
          T2: {message: 'T2 message', description: 'T2 desc'},
          T3: {message: 'T3 message', description: 'T3 desc'},
        },
        {
          T4: {message: 'T4 message', description: 'T4 desc'},
        },
        {T2: {message: 'T2 message 2', description: 'T2 desc 2'}},
      ]),
    ).toEqual({
      T1: {message: 'T1 message', description: 'T1 desc'},
      T2: {message: 'T2 message 2', description: 'T2 desc 2'},
      T3: {message: 'T3 message', description: 'T3 desc'},
      T4: {message: 'T4 message', description: 'T4 desc'},
    });
  });
});

describe('mapAsyncSequential', () => {
  function sleep(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  }

  test('map sequentially', async () => {
    const itemToTimeout: Record<string, number> = {
      '1': 50,
      '2': 150,
      '3': 100,
    };
    const items = Object.keys(itemToTimeout);

    const itemMapStartsAt: Record<string, number> = {};
    const itemMapEndsAt: Record<string, number> = {};

    const timeBefore = Date.now();
    await expect(
      mapAsyncSequential(items, async (item) => {
        const itemTimeout = itemToTimeout[item];
        itemMapStartsAt[item] = Date.now();
        await sleep(itemTimeout);
        itemMapEndsAt[item] = Date.now();
        return `${item} mapped`;
      }),
    ).resolves.toEqual(['1 mapped', '2 mapped', '3 mapped']);
    const timeAfter = Date.now();

    const timeTotal = timeAfter - timeBefore;

    const totalTimeouts = sum(Object.values(itemToTimeout));
    expect(timeTotal > totalTimeouts);

    expect(itemMapStartsAt['1'] > 0);
    expect(itemMapStartsAt['2'] > itemMapEndsAt['1']);
    expect(itemMapStartsAt['3'] > itemMapEndsAt['2']);
  });
});

describe('findAsyncSequencial', () => {
  function sleep(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  }

  test('find sequentially', async () => {
    const items = ['1', '2', '3'];

    const findFn = jest.fn(async (item: string) => {
      await sleep(50);
      return item === '2';
    });

    const timeBefore = Date.now();
    await expect(findAsyncSequential(items, findFn)).resolves.toEqual('2');
    const timeAfter = Date.now();

    expect(findFn).toHaveBeenCalledTimes(2);
    expect(findFn).toHaveBeenNthCalledWith(1, '1');
    expect(findFn).toHaveBeenNthCalledWith(2, '2');

    const timeTotal = timeAfter - timeBefore;
    expect(timeTotal > 100);
    expect(timeTotal < 150);
  });
});

describe('updateTranslationFileMessages', () => {
  test('should update messages', () => {
    expect(
      updateTranslationFileMessages(
        {
          path: 'abc',
          content: {
            t1: {message: 't1 message', description: 't1 desc'},
            t2: {message: 't2 message', description: 't2 desc'},
            t3: {message: 't3 message', description: 't3 desc'},
          },
        },
        (message) => `prefix ${message} suffix`,
      ),
    ).toEqual({
      path: 'abc',
      content: {
        t1: {message: 'prefix t1 message suffix', description: 't1 desc'},
        t2: {message: 'prefix t2 message suffix', description: 't2 desc'},
        t3: {message: 'prefix t3 message suffix', description: 't3 desc'},
      },
    });
  });
});

describe('parseMarkdownHeadingId', () => {
  test('can parse simple heading without id', () => {
    expect(parseMarkdownHeadingId('## Some heading')).toEqual({
      text: '## Some heading',
      id: undefined,
    });
  });

  test('can parse simple heading with id', () => {
    expect(parseMarkdownHeadingId('## Some heading {#custom-_id}')).toEqual({
      text: '## Some heading',
      id: 'custom-_id',
    });
  });

  test('can parse heading not ending with the id', () => {
    expect(parseMarkdownHeadingId('## {#custom-_id} Some heading')).toEqual({
      text: '## {#custom-_id} Some heading',
      id: undefined,
    });
  });

  test('can parse heading with multiple id', () => {
    expect(parseMarkdownHeadingId('## Some heading {#id1} {#id2}')).toEqual({
      text: '## Some heading {#id1}',
      id: 'id2',
    });
  });

  test('can parse heading with link and id', () => {
    expect(
      parseMarkdownHeadingId(
        '## Some heading [facebook](https://facebook.com) {#id}',
      ),
    ).toEqual({
      text: '## Some heading [facebook](https://facebook.com)',
      id: 'id',
    });
  });

  test('can parse heading with only id', () => {
    expect(parseMarkdownHeadingId('## {#id}')).toEqual({
      text: '##',
      id: 'id',
    });
  });
});
