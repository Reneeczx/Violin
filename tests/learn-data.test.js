import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LEARNING_CONTENT,
  buildLearningIndex,
  buildLearningRelationships,
  getLearningDefaults,
} from '../learning/js/learn-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

test('learning defaults point to real content entries', () => {
  const index = buildLearningIndex();
  const defaults = getLearningDefaults();

  assert.ok(index.modulesById[defaults.moduleId]);
  assert.ok(index.flowsById[defaults.flowId]);
  assert.ok(index.termsById[defaults.termId]);
  assert.ok(index.tasksById[defaults.taskId]);
});

test('learning flows only reference known modules', () => {
  const index = buildLearningIndex();

  LEARNING_CONTENT.flows.forEach((flow) => {
    flow.moduleIds.forEach((moduleId) => {
      assert.ok(index.modulesById[moduleId], `Unknown flow module: ${moduleId}`);
    });

    flow.steps.forEach((step) => {
      assert.ok(index.modulesById[step.moduleId], `Unknown step module: ${step.moduleId}`);
    });
  });
});

test('module cross references only point to known modules and curated terms', () => {
  const index = buildLearningIndex();

  LEARNING_CONTENT.modules.forEach((module) => {
    [...module.dependsOn, ...module.followUp].forEach((moduleId) => {
      assert.ok(index.modulesById[moduleId], `Unknown module link: ${module.id} -> ${moduleId}`);
    });

    module.concepts.forEach((conceptId) => {
      assert.ok(index.termsById[conceptId], `Unknown module concept: ${module.id} -> ${conceptId}`);
    });
  });
});

test('every module has one or two code reading snippets with real files', () => {
  const index = buildLearningIndex();

  LEARNING_CONTENT.modules.forEach((module) => {
    const readings = index.codeReadingsByModuleId[module.id] || [];
    assert.ok(readings.length >= 1, `Missing code reading snippets for module: ${module.id}`);
    assert.ok(readings.length <= 2, `Too many code reading snippets for module: ${module.id}`);
  });

  LEARNING_CONTENT.codeReadings.forEach((reading) => {
    assert.ok(index.modulesById[reading.moduleId], `Unknown code reading module: ${reading.id} -> ${reading.moduleId}`);

    const absolutePath = path.join(projectRoot, reading.file);
    assert.ok(fs.existsSync(absolutePath), `Missing code reading file: ${reading.file}`);
  });
});

test('terms and tasks reference real modules', () => {
  const index = buildLearningIndex();

  LEARNING_CONTENT.terms.forEach((term) => {
    assert.ok(index.modulesById[term.moduleId], `Unknown term module: ${term.id} -> ${term.moduleId}`);
  });

  LEARNING_CONTENT.tasks.forEach((task) => {
    task.focusModuleIds.forEach((moduleId) => {
      assert.ok(index.modulesById[moduleId], `Unknown task module: ${task.id} -> ${moduleId}`);
    });
  });
});

test('task file paths exist inside the project', () => {
  LEARNING_CONTENT.tasks.forEach((task) => {
    task.filePaths.forEach((filePath) => {
      const absolutePath = path.join(projectRoot, filePath);
      assert.ok(fs.existsSync(absolutePath), `Missing learning task file: ${filePath}`);
    });
  });
});

test('relationship builder exposes incoming and outgoing module links', () => {
  const relationships = buildLearningRelationships();

  assert.deepEqual(relationships.outgoingById['practice-player'], ['audio-engine', 'score-utils', 'event-bus']);
  assert.deepEqual(relationships.incomingById['score-utils'], ['home-view', 'practice-player', 'music-theory']);
  assert.ok(relationships.edges.some((edge) => edge.from === 'app-shell' && edge.to === 'routing'));
});
