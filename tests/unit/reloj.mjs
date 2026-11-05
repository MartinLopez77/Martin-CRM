// Fija la fecha de los tests unitarios: jueves 5 de noviembre de 2026, 10:00 en España (como los E2E).
import { mock } from 'node:test';

mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-05T10:00:00+01:00') });
