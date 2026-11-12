# Objetivos por comida

## Intención

Ayudar a repartir los objetivos diarios de calorías y proteína entre las comidas, sin obligar al usuario a seguir ese reparto.

## Diseño aprobado

- En Ajustes se muestran las seis categorías existentes: desayuno, snack, comida, merienda, cena y picoteo.
- Al activar los objetivos por comida, calorías y proteína diarias se reparten inicialmente por igual entre esas seis categorías.
- Cada valor se puede editar de forma independiente. Un campo vacío desactiva ese objetivo para esa comida.
- Los valores se guardan como configuración del usuario y persisten entre sesiones.
- El panel diario compara calorías y proteína consumidas por comida con los objetivos configurados. Si una comida no tiene un objetivo, no muestra progreso para ese nutriente.
- Cambiar los objetivos diarios no debe sobrescribir un reparto ya editado; se ofrece una acción explícita para volver a repartir por igual.

## Enfoques considerados

1. Reparto automático e inmutable: sencillo, pero no se adapta a preferencias individuales.
2. Reparto automático editable y opcional: conserva un punto de partida útil y permite personalizar o quitar metas. **Elegido.**
3. Metas independientes por comida desde cero: flexible, pero añade demasiada configuración inicial.

## Límites y decisiones

- No se modifica el cálculo de objetivos diarios ni la asignación de entradas a comidas.
- Los objetivos por comida son guía visual, no límites ni alertas.
- Calorías y proteína se configuran por separado; carbohidratos y grasas continúan como resumen diario.
- La configuración se almacena como JSON en una nueva columna de UserSettings, con compatibilidad para cuentas sin objetivos guardados.
