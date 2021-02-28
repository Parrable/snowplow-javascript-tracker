/*
 * JavaScript tracker for Snowplow: tests/unit/in_queue.spec.js
 *
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright
 * 2012-2016 Snowplow Analytics Ltd. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { InQueueManager } from '../../src/in_queue';

import { newTracker } from '@snowplow/browser-tracker';
import { BrowserTracker, allTrackersForGroup } from '@snowplow/browser-core';

jest.mock('@snowplow/browser-tracker');
jest.mock('@snowplow/browser-core');
const mockNewTracker = newTracker as jest.Mock<void>;
const mockAllTrackers = allTrackersForGroup as jest.Mock<Array<BrowserTracker>>;

describe('InQueueManager', () => {
  let output = 0;
  const newTracker = (): any => {
    let attribute = 10;
    return {
      enableActivityTracking: function ({ n }: { n: number }) {
        attribute += n;
      },
      setVisitorCookieTimeout: function ({ p }: { p: number }) {
        attribute = p;
      },
      trackPageView: function () {
        output = attribute;
      },
      updatePageActivity: function () {
        output += attribute;
      },
    };
  };

  const mockTracker: Record<string, any> = {};
  mockNewTracker.mockImplementation((name: string) => {
    mockTracker[name] = newTracker();
  });
  mockAllTrackers.mockImplementation(() => Object.values(mockTracker));

  const asyncQueueOps = [
    ['newTracker', 'firstTracker', 'firstEndpoint'],
    ['enableActivityTracking', { n: 5 }],
    ['trackPageView'],
  ];
  const asyncQueue = InQueueManager('snowplow', asyncQueueOps);

  it('Make a proxy, Function originally stored in asyncQueue is executed when asyncQueue becomes an AsyncQueueProxy', () => {
    expect(output).toEqual(15);
  });

  it('Add to asyncQueue after conversion, Function added to asyncQueue after it becomes an AsyncQueueProxy is executed', () => {
    asyncQueue.push(['setVisitorCookieTimeout', { p: 7 }]);
    asyncQueue.push(['trackPageView']);
    expect(output).toEqual(7);
  });

  it("Backward compatibility: Create a tracker using the legacy setCollectorUrl method, A second tracker is created and both trackers' attributes are added to output", () => {
    asyncQueue.push(['newTracker', 'secondTracker', 'secondEndpoint']);
    asyncQueue.push(['updatePageActivity']);
    expect(output).toEqual(24);
  });

  it("Use 'function:tracker1;tracker2' syntax to control which trackers execute which functions, Set the attributes of the two trackers individually, then add both to output", () => {
    asyncQueue.push(['setVisitorCookieTimeout:firstTracker', { p: 2 }]);
    asyncQueue.push(['setVisitorCookieTimeout:secondTracker', { p: 3 }]);
    asyncQueue.push(['updatePageActivity:firstTracker;secondTracker']);
    expect(output).toEqual(29);
  });

  it('Execute a user-defined custom callback', () => {
    let callbackExecuted = false;
    asyncQueue.push([
      function () {
        callbackExecuted = true;
      },
    ]);
    expect(callbackExecuted).toBe(true);
  });

  it('Executing a custom callback that errors should not throw', () => {
    expect(() => {
      asyncQueue.push([
        function () {
          throw 'caught error';
        },
      ]);
    }).not.toThrow();
  });
});