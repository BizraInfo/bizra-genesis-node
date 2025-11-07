// synthesis_orchestrator/src/parser.rs
// Safe JSON parsing with simd-json

#[derive(thiserror::Error, Debug)]
pub enum ParseError {
    #[error("simd-json error: {0}")]
    SimdJson(#[from] simd_json::Error),
    #[error("unbalanced json")]
    UnbalancedJson,
}

pub struct EarlyCloseJsonParser;

impl EarlyCloseJsonParser {
    pub fn parse_balanced_json(bytes: &[u8]) -> Result<simd_json::OwnedValue, ParseError> {
        let mut buf = bytes.to_vec();
        Self::strip_bom(&mut buf);
        simd_json::to_owned_value(&mut buf).map_err(ParseError::SimdJson)
    }

    #[inline]
    fn strip_bom(buf: &mut Vec<u8>) {
        const BOM: &[u8] = &[0xEF, 0xBB, 0xBF];
        if buf.starts_with(BOM) {
            buf.drain(..3);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_json() {
        let json = br#"{"test":true}"#;
        let result = EarlyCloseJsonParser::parse_balanced_json(json);
        assert!(result.is_ok());
    }
}
