/*
 * JavaScript tracker for Snowplow: queue.js
 *
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright
 * 2012-2020 Snowplow Analytics Ltd. All rights reserved.
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

import {
  warn,
  isFunction,
  addTracker,
  Tracker,
  SharedState,
  createSharedState,
  BrowserTracker,
  allTrackersForGroup,
} from '@snowplow/browser-core';
import * as Snowplow from '@snowplow/browser-tracker';
import { Plugins } from './features';

export interface Queue {
  push: (...args: any[]) => void;
}

/************************************************************
 * Proxy object
 * - this allows the caller to continue push()'ing to _snaq
 *   after the Tracker has been initialized and loaded
 ************************************************************/

export function InQueueManager(functionName: string, asyncQueue: Array<unknown>): Queue {
  const sharedState: SharedState = createSharedState();
  let version: string, availableFunctions: Record<string, Function>;
  ({ version, ...availableFunctions } = Snowplow);

  /**
   * Output an array of the form ['functionName', [trackerName1, trackerName2, ...]]
   *
   * @param string inputString
   */
  function parseInputString(inputString: string): [string, string[] | undefined] {
    var separatedString = inputString.split(':'),
      extractedFunction = separatedString[0],
      extractedNames = separatedString.length > 1 ? separatedString[1].split(';') : undefined;

    return [extractedFunction, extractedNames];
  }

  /**
   * apply wrapper
   *
   * @param array parameterArray An array comprising either:
   *      [ 'methodName', optional_parameters ]
   * or:
   *      [ functionObject, optional_parameters ]
   */
  function applyAsyncFunction(...args: any[]) {
    var i, f, parameterArray, input, parsedString, names;

    // Outer loop in case someone push'es in zarg of arrays
    for (i = 0; i < args.length; i += 1) {
      parameterArray = args[i];

      // Arguments is not an array, so we turn it into one
      input = Array.prototype.shift.call(parameterArray);

      // Custom callback rather than tracker method, called with trackerDictionary as the context
      if (isFunction(input)) {
        try {
          const namedTrackers = allTrackersForGroup(functionName);
          let fnTrackers: Record<string, BrowserTracker> = {};
          for (const tracker of namedTrackers) {
            fnTrackers[tracker.id.replace(`${functionName}_`, '')] = tracker;
          }
          input.apply(fnTrackers, parameterArray);
        } catch (e) {
          warn(`Custom callback error - ${e}`);
        } finally {
          continue;
        }
      }

      parsedString = parseInputString(input);
      f = parsedString[0];
      names = parsedString[1];

      if (f === 'newTracker') {
        const trackerId = `${functionName}_${parameterArray[0]}`;
        const plugins = Plugins(parameterArray[2]);
        addTracker(
          trackerId,
          Tracker(trackerId, parameterArray[0], version, parameterArray[1], sharedState, {
            ...parameterArray[2],
            plugins: plugins.map((p) => p[0]),
          }),
          functionName
        );
        plugins.forEach((p) => {
          // Spread in any new plugin methods
          availableFunctions = {
            ...availableFunctions,
            ...p[1],
          };
        });

        continue;
      }

      if (availableFunctions[f]) {
        let fnParameters: Array<unknown>;
        if (parameterArray[0]) {
          fnParameters = [parameterArray[0]];
        } else {
          fnParameters = availableFunctions[f].length === 2 ? [{}] : [];
        }

        if (names) {
          fnParameters.push(names.map((n) => `${functionName}_${n}`));
        } else {
          fnParameters.push(allTrackersForGroup(functionName).map((t) => t.id));
        }

        try {
          availableFunctions[f].apply(null, fnParameters);
        } catch (ex) {
          warn(f + ' did not succeed');
        }
      } else {
        warn(f + ' is not an available function');
      }
    }
  }

  // We need to manually apply any events collected before this initialization
  for (var i = 0; i < asyncQueue.length; i++) {
    applyAsyncFunction(asyncQueue[i]);
  }

  return {
    push: applyAsyncFunction,
  };
}