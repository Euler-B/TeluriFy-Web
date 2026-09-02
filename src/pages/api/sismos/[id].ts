import type { APIRoute } from 'astro';
import { findSismoById } from '../../../services/api';

export const GET: APIRoute = async ({ params, request }) => {
  if (!params.id) {
    return new Response(JSON.stringify({ error: 'ID de sismo requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const sismo = await findSismoById(params.id, request.signal);
    if (!sismo) {
      return new Response(JSON.stringify({ error: 'Sismo no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: sismo }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'No se pudo consultar el sismo' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
