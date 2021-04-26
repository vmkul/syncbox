import { beforeEach, describe, expect, test } from '@jest/globals';
import EventDispatcher from '../event_dispatcher';

const EV_ONE = 'event';
const EV_TWO = 'another event';

describe('Tests for EventDispatcher', () => {
  let ed;

  beforeEach(() => {
    ed = new EventDispatcher();
  });

  test('Event registered before call to waitFor', async () => {
    ed.registerEvent(EV_ONE);
    ed.registerEvent(EV_TWO);

    await ed.waitEvent(EV_ONE);
    await ed.waitEvent(EV_TWO);
  });

  test('Event registered after call to waitFor', async () => {
    setImmediate(() => {
      ed.registerEvent(EV_ONE);
      ed.registerEvent(EV_TWO);
    });

    await ed.waitEvent(EV_ONE);
    await ed.waitEvent(EV_TWO);
  });

  test('Correct event counting', () => {
    for (let i = 0; i < 5; i++) {
      ed.waitEvent(EV_ONE);
    }

    for (let i = 0; i < 10; i++) {
      ed.registerEvent(EV_ONE);
      ed.registerEvent(EV_TWO);
    }

    expect(ed.eventCount.get(EV_ONE)).toBe(5);
    expect(ed.eventCount.get(EV_TWO)).toBe(10);
  });
});
