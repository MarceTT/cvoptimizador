import { NextRequest } from "next/server";
import { auth, generateApiToken } from "@/lib/auth";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = session.user as { id: string; email: string };

    // Generate JWT for FastAPI
    const apiToken = await generateApiToken(user.id, user.email);

    // Get form data from request
    const formData = await request.formData();
    const cv = formData.get("cv") as File | null;
    const jobDescription = formData.get("job_description") as string | null;

    if (!cv) {
      return Response.json({ error: "Falta el archivo CV" }, { status: 400 });
    }

    if (!jobDescription) {
      return Response.json({ error: "Ingresá la descripción del puesto" }, { status: 400 });
    }

    // Forward to FastAPI
    const apiFormData = new FormData();
    apiFormData.append("cv", cv);
    apiFormData.append("job_description", jobDescription);

    // Forward optional fields
    const cargo = formData.get("cargo");
    const empresa = formData.get("empresa");
    if (cargo) apiFormData.append("cargo", cargo);
    if (empresa) apiFormData.append("empresa", empresa);

    const response = await fetch(`${FASTAPI_URL}/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail ?? errorData.error ?? `Error ${response.status}`;
      } catch {
        errorMessage = errorText || `Error ${response.status}`;
      }
      return Response.json({ error: errorMessage }, { status: response.status });
    }

    // Stream the SSE response back to the client
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Stream FastAPI response to client
    const reader = response.body?.getReader();
    if (!reader) {
      return Response.json({ error: "No response from API" }, { status: 502 });
    }

    // Start streaming in background
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (err) {
        console.error("Stream error:", err);
      } finally {
        await writer.close();
        reader.releaseLock();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Optimize route error:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    return Response.json({ error: message }, { status: 500 });
  }
}
