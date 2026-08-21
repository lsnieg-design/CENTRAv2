# Gestión Institucional — versión comercial

Esta versión está preparada para reutilizarse con distintas instituciones.

## Configuración inicial del proyecto

El único dato técnico que debe configurar quien despliega la aplicación es la conexión de Firebase en `.env` usando `.env.example` como guía. Esa conexión no se configura desde la propia app porque es la infraestructura que permite que la aplicación exista y guarde información.

## Configuración institucional desde la app

Una vez ingresado un usuario con rol `admin` / `super-admin`, abrir **Más → Configuración**.

Desde allí se puede modificar sin tocar código:

- nombre de la institución
- nombre corto
- título del portal
- nombre del sistema
- logo desde un archivo o URL
- colores
- correo, teléfono, domicilio y sitio web
- año lectivo
- roles
- turnos
- modalidades
- tipos de evento
- días no laborables
- módulos disponibles
- exportación e importación de la configuración

Los cambios se guardan en Firestore y también se cachean localmente para que la identidad se vea inmediatamente.

## Seguridad

La versión comercial no incluye credenciales del proyecto Firebase original ni claves VAPID de la institución de origen.

La autenticación actual del producto todavía usa el mecanismo heredado de usuarios de la aplicación. Para una versión comercial definitiva se recomienda migrarla a **Firebase Authentication**, con recuperación de contraseña y reglas por rol.

## Configuración de módulos

Desde **Configuración > Módulos y funcionalidades** se puede activar o desactivar cada módulo ofrecido por el software. Los módulos desactivados desaparecen de la navegación y también quedan bloqueados aunque alguien intente abrirlos directamente. La configuración se guarda por institución y puede exportarse/importarse junto con el resto de la configuración.

Los módulos **Inicio** y **Configuración** permanecen disponibles para evitar que una instalación quede sin forma de administrarse.
