const {
    extractTokenFromHeaderOrQuery,
    getFallbackClassification,
    formatConfidence
} = require("./helpers");

describe("Helpers Unit Tests", () => {
    
    describe("extractTokenFromHeaderOrQuery", () => {
        test("should extract token from Bearer authorization header", () => {
            const authHeader = "Bearer token12345";
            const result = extractTokenFromHeaderOrQuery(authHeader, null);
            expect(result).toBe("token12345");
        });

        test("should extract token from raw authorization header without Bearer prefix", () => {
            const authHeader = "rawtokenabc";
            const result = extractTokenFromHeaderOrQuery(authHeader, null);
            expect(result).toBe("rawtokenabc");
        });

        test("should extract token from query param when header is absent", () => {
            const result = extractTokenFromHeaderOrQuery(null, "querytoken789");
            expect(result).toBe("querytoken789");
        });

        test("should return null when both header and query param are missing", () => {
            const result = extractTokenFromHeaderOrQuery(null, null);
            expect(result).toBeNull();
        });
    });

    describe("getFallbackClassification", () => {
        test("should classify billing related issues into Billing & Invoicing", () => {
            const result = getFallbackClassification("Invoice payment failed", "I was charged twice.");
            expect(result.category).toBe("Billing & Invoicing");
            expect(result.priority).toBe("Medium");
        });

        test("should classify KYC or onboard related queries into Onboarding & KYC", () => {
            const result = getFallbackClassification("KYC verification stuck", "Please review my documents.");
            expect(result.category).toBe("Onboarding & KYC");
            expect(result.priority).toBe("Medium");
        });

        test("should classify disputes or chargebacks into Transaction Disputes", () => {
            const result = getFallbackClassification("Chargeback dispute raised", "A fraudulent transaction occurred.");
            expect(result.category).toBe("Transaction Disputes");
            expect(result.priority).toBe("Medium");
        });

        test("should classify suspension or outages into Account & Compliance with High priority", () => {
            const result = getFallbackClassification("Account suspended", "Complete server outage reported.");
            expect(result.category).toBe("Account & Compliance");
            expect(result.priority).toBe("High");
        });

        test("should return default classification for non-matching general queries", () => {
            const result = getFallbackClassification("How to use API", "Could you provide API endpoint examples?");
            expect(result.category).toBe("API & Integration");
            expect(result.priority).toBe("Medium");
            expect(result.confidence).toBe(0.8);
        });
    });

    describe("formatConfidence", () => {
        test("should format and map high confidence score >= 0.8 to High", () => {
            const result = formatConfidence(0.85);
            expect(result).toEqual({
                level: "High",
                formatted: "85%",
                color: "green"
            });
        });

        test("should format and map medium confidence score >= 0.5 to Medium", () => {
            const result = formatConfidence(0.65);
            expect(result).toEqual({
                level: "Medium",
                formatted: "65%",
                color: "yellow"
            });
        });

        test("should format and map low confidence score < 0.5 to Low", () => {
            const result = formatConfidence(0.3);
            expect(result).toEqual({
                level: "Low",
                formatted: "30%",
                color: "red"
            });
        });

        test("should handle score bounds by clamping between 0 and 1", () => {
            const resultOver = formatConfidence(1.5);
            expect(resultOver).toEqual({
                level: "High",
                formatted: "100%",
                color: "green"
            });

            const resultUnder = formatConfidence(-0.2);
            expect(resultUnder).toEqual({
                level: "Low",
                formatted: "0%",
                color: "red"
            });
        });

        test("should fallback to Low / 0% on invalid numeric types", () => {
            const result = formatConfidence("not-a-number");
            expect(result).toEqual({
                level: "Low",
                formatted: "0%",
                color: "red"
            });
        });
    });

});
