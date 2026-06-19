import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedEmail } from "./constants";
import {
  getWebAuthnOrigin,
  getWebAuthnRpId,
  getWebAuthnRpName,
} from "./webauthn-config";

export async function buildRegistrationOptions(userId: number, email: string) {
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    include: { credentials: true },
  });
  if (!user) throw new Error("User not found");

  return generateRegistrationOptions({
    rpName: getWebAuthnRpName(),
    rpID: getWebAuthnRpId(),
    userName: email,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: user.credentials.map((cred) => ({
      id: cred.credential_id,
      transports: cred.transports
        ? (cred.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });
}

export async function verifyRegistration(
  userId: number,
  response: RegistrationResponseJSON,
  expectedChallenge: string
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getWebAuthnOrigin(),
    expectedRPID: getWebAuthnRpId(),
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Passkey registration could not be verified");
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await prisma.webAuthnCredential.create({
    data: {
      user_id: userId,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: (response.response.transports ?? []).join(","),
    },
  });

  return true;
}

export async function buildAuthenticationOptions(email?: string) {
  let allowCredentials:
    | { id: string; transports?: AuthenticatorTransport[] }[]
    | undefined;

  if (email) {
    const user = await prisma.appUser.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { credentials: true },
    });
    if (!user || user.credentials.length === 0) {
      return generateAuthenticationOptions({
        rpID: getWebAuthnRpId(),
        userVerification: "preferred",
      });
    }
    allowCredentials = user.credentials.map((cred) => ({
      id: cred.credential_id,
      transports: cred.transports
        ? (cred.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    }));
  }

  return generateAuthenticationOptions({
    rpID: getWebAuthnRpId(),
    userVerification: "preferred",
    allowCredentials,
  });
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string
) {
  const credential = await prisma.webAuthnCredential.findUnique({
    where: { credential_id: response.id },
    include: { user: true },
  });

  if (!credential) {
    throw new Error("Passkey not recognized");
  }

  if (!isAuthorizedEmail(credential.user.email)) {
    throw new Error("Account not authorized");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getWebAuthnOrigin(),
    expectedRPID: getWebAuthnRpId(),
    credential: {
      id: credential.credential_id,
      publicKey: credential.public_key,
      counter: Number(credential.counter),
      transports: credential.transports
        ? (credential.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    },
  });

  if (!verification.verified) {
    throw new Error("Passkey authentication failed");
  }

  const { newCounter } = verification.authenticationInfo;
  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: { counter: BigInt(newCounter) },
  });

  return credential.user;
}
