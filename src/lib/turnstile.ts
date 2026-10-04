/**
 * Cloudflare Turnstile — 后端验证工具
 *
 * 前端组件生成 token，后端用 secret key 调 siteverify 端点确认。
 * 文档: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * 验证前端传回的 Turnstile token
 * @param token 前端 Turnstile 组件在 onSuccess 里给的 token 字符串
 * @returns { success: true } 通过；{ success: false, error } 失败原因
 */
export async function verifyTurnstile(
  token: string | undefined | null
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // 没配 secret key 就跳过验证（开发环境方便调试）
  if (!secretKey) {
    console.warn("[Turnstile] TURNSTILE_SECRET_KEY 未配置，跳过验证");
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "人机验证未通过，请重新验证" };
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

    // Cloudflare 可能返回 4xx/5xx（网络问题），这时候放过请求而不是阻断
    // 因为用户已经在前端过了 widget，后端超时大概率是临时问题
    if (!res.ok) {
      console.error(
        "[Turnstile] siteverify 请求失败:",
        res.status,
        await res.text()
      );
      return { success: true }; // fail-open：网络波动时不阻断正常用户
    }

    const data = (await res.json()) as {
      success: boolean;
      error_codes?: string[];
    };

    if (data.success) {
      return { success: true };
    }

    const reason = data.error_codes?.join(", ") ?? "unknown";
    console.warn("[Turnstile] 验证失败, error_codes:", reason);
    return {
      success: false,
      error: "人机验证未通过，请重新尝试",
    };
  } catch (err) {
    // 网络异常 — fail-open
    console.error("[Turnstile] siteverify 异常:", err);
    return { success: true };
  }
}
