import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { baselineFileName } from "./validate-migration-chain.mjs";
import ts from "typescript";

export function extractOpportunityStageValuesFromDomain(contents) {
  const sourceFile = ts.createSourceFile("domain.ts", contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declarations = sourceFile.statements.filter(
    (statement) =>
      (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name.text === "Opportunity"
  );

  if (declarations.length === 0) {
    throw new Error("Opportunity type or interface declaration was not found.");
  }

  if (declarations.length > 1) {
    throw new Error(`Expected exactly one Opportunity declaration, found ${declarations.length}.`);
  }

  const declaration = declarations[0];
  const members = ts.isInterfaceDeclaration(declaration)
    ? declaration.members
    : ts.isTypeLiteralNode(declaration.type)
      ? declaration.type.members
      : undefined;

  if (!members) {
    throw new Error("Opportunity must be declared as an interface or a type literal with a stage property.");
  }

  const stageProperties = members.filter(
    (member) =>
      ts.isPropertySignature(member) &&
      member.name &&
      (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) &&
      member.name.text === "stage"
  );

  if (stageProperties.length === 0) {
    throw new Error("Opportunity.stage property was not found.");
  }

  if (stageProperties.length > 1) {
    throw new Error(`Expected exactly one Opportunity.stage property, found ${stageProperties.length}.`);
  }

  const stageType = stageProperties[0].type;
  if (!stageType) {
    throw new Error("Opportunity.stage must declare string literal values.");
  }

  const typeNodes = ts.isUnionTypeNode(stageType) ? stageType.types : [stageType];
  const values = typeNodes.map((typeNode) => {
    if (!ts.isLiteralTypeNode(typeNode) || !ts.isStringLiteral(typeNode.literal)) {
      throw new Error("Opportunity.stage must be a string-literal type or union.");
    }

    return typeNode.literal.text;
  });

  if (new Set(values).size !== values.length) {
    throw new Error("Opportunity.stage contains duplicate string-literal values.");
  }

  return values;
}

export function extractOpportunityStageValuesFromSchema(contents) {
  const canonicalMatch = contents.match(/constraint\s+"?chk_opportunity_stage"?\s+check\s*\(\s*\(?\s*stage\s*=\s*any\s*\(\s*array\[([^\]]+)\]/i);
  const legacyMatch = contents.match(/constraint\s+chk_opportunity_stage\s+check\s*\(\s*stage\s+in\s*\(([^)]+)\)\s*\)/i);
  const match = canonicalMatch ?? legacyMatch;
  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/'([^']+)'/g)].map((value) => value[1]);
}

function describeDifference(label, domainValues, databaseValues) {
  const missingFromTypeScript = databaseValues.filter((value) => !domainValues.includes(value));
  const missingFromDatabase = domainValues.filter((value) => !databaseValues.includes(value));

  if (missingFromTypeScript.length === 0 && missingFromDatabase.length === 0) {
    return undefined;
  }

  return `${label} mismatch. TypeScript missing values: ${missingFromTypeScript.join(",") || "(none)"}. Database missing values: ${missingFromDatabase.join(",") || "(none)"}.`;
}

function captureValues(label, extractor, contents, failures) {
  try {
    return extractor(contents);
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

export function validateOpportunityStageAlignment({ domain, schema, migration }) {
  const failures = [];
  const domainValues = captureValues("TypeScript Opportunity.stage extraction failed", extractOpportunityStageValuesFromDomain, domain, failures);
  const schemaValues = captureValues("Base schema Opportunity.stage extraction failed", extractOpportunityStageValuesFromSchema, schema, failures);
  const migrationValues = captureValues("Alignment migration Opportunity.stage extraction failed", extractOpportunityStageValuesFromSchema, migration, failures);

  if (schemaValues.length === 0 && !failures.some((failure) => failure.startsWith("Base schema"))) {
    failures.push("Base schema chk_opportunity_stage values were not found.");
  }

  if (migrationValues.length === 0 && !failures.some((failure) => failure.startsWith("Alignment migration"))) {
    failures.push("Alignment migration chk_opportunity_stage values were not found.");
  }

  if (domainValues.length > 0 && schemaValues.length > 0) {
    const schemaDifference = describeDifference("Base schema chk_opportunity_stage", domainValues, schemaValues);
    if (schemaDifference) failures.push(schemaDifference);
  }

  if (domainValues.length > 0 && migrationValues.length > 0) {
    const migrationDifference = describeDifference("Alignment migration chk_opportunity_stage", domainValues, migrationValues);
    if (migrationDifference) failures.push(migrationDifference);
  }

  return { domainValues, schemaValues, migrationValues, failures };
}

function main() {
  const root = process.cwd();
  const domain = readFileSync(resolve(root, "src/types/domain.ts"), "utf8");
  // CX-0194 Gate A: the canonical baseline is the active migration chain and the
  // single source for the SQL-side Opportunity.stage constraint.
  const canonical = readFileSync(resolve(root, `supabase/migrations/${baselineFileName}`), "utf8");
  const { domainValues, failures } = validateOpportunityStageAlignment({ domain, schema: canonical, migration: canonical });

  if (failures.length > 0) {
    console.error("Domain/schema alignment validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Domain/schema alignment validation passed.");
  console.log(`Opportunity.stage values: ${domainValues.join(", ")}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
