// @ts-check
import { test, expect } from "@playwright/test";
import { effect, batch, signal, computed } from "../src/hooks/reactivity.js";

test("Reactivity: signal", () => {
  const count = signal(0);
  const values = [];
  effect(() => {
    values.push(count());
  });
  // Al ejecutar effect se ejecuta de inmediato, capturando el valor 0.
  expect(values).toEqual([0]);

  // Actualizamos la señal, lo que dispara el efecto nuevamente.
  count(1);
  expect(values).toEqual([0, 1]);
});

test("Reactivity: effect", () => {
  const count = signal(0);
  const values = [];
  const cleanup = effect(() => {
    values.push(count());
  });

  expect(values).toEqual([0]); // Efecto inicial: values = [0]
  count(1);
  expect(values).toEqual([0, 1]); // Después de actualizar count a 1: values = [0, 1]
  cleanup();
  count(2);
  expect(values).toEqual([0, 1]); // Espera que cleanup detenga el efecto, pero falla
});

test("Reactivity: computed", () => {
  const count = signal(0);
  const values = [];
  // computed genera un valor derivado
  const computedValue = computed(() => count() * 2);
  // Registramos un efecto que lee el computed.
  effect(() => {
    values.push(computedValue());
  });
  // Inicialmente, count es 0 -> computed: 0
  expect(values).toEqual([0]);

  // Al actualizar count a 1, computed debería actualizarse a 2
  count(1);
  expect(values).toEqual([0, 2]);
});

test("Reactivity: batch", () => {
  // Crear señales reactivas
  const signalA = signal(0);
  const signalB = signal(0);
  const values = []; // Almacenar los valores calculados por el efecto

  // Definir un efecto que depende de ambas señales
  effect(() => {
      values.push(signalA() + signalB());
  });

  // Verificar el estado inicial: el efecto se ejecuta una vez con signalA = 0 y signalB = 0
  expect(values).toEqual([0]);

  // Ejecutar múltiples actualizaciones dentro de un batch
  batch(() => {
      signalA(1); // Actualizar signalA a 1
      signalB(2); // Actualizar signalB a 2
  });

  // Verificar que el efecto se ejecutó solo una vez después del batch,
  // con los valores finales: signalA = 1 y signalB = 2
  expect(values).toEqual([0, 3]);
});