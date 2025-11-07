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
    use simd_json::prelude::*;

    #[test]
    fn test_parse_simple_json() {
        let json = br#"{"test":true}"#;
        let result = EarlyCloseJsonParser::parse_balanced_json(json);
        assert!(result.is_ok());
        let value = result.unwrap();
        assert!(value["test"].as_bool().unwrap_or(false));
    }

    #[test]
    fn test_parse_complex_json() {
        let json = br#"{"name":"test","value":42,"nested":{"key":"value"}}"#;
        let result = EarlyCloseJsonParser::parse_balanced_json(json);
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value["name"].as_str().unwrap_or(""), "test");
        assert_eq!(value["value"].as_u64().unwrap_or(0), 42);
    }

    #[test]
    fn test_parse_json_with_bom() {
        let json_with_bom = &[0xEF, 0xBB, 0xBF, b'{', b'"', b't', b'e', b's', b't', b'"', b':', b't', b'r', b'u', b'e', b'}'];
        let result = EarlyCloseJsonParser::parse_balanced_json(json_with_bom);
        assert!(result.is_ok());
        let value = result.unwrap();
        assert!(value["test"].as_bool().unwrap_or(false));
    }

    #[test]
    fn test_parse_invalid_json() {
        let invalid_json = b"{invalid json}";
        let result = EarlyCloseJsonParser::parse_balanced_json(invalid_json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_empty_json() {
        let empty_json = b"{}";
        let result = EarlyCloseJsonParser::parse_balanced_json(empty_json);
        assert!(result.is_ok());
        let value = result.unwrap();
        assert!(value.is_object());
    }

    #[test]
    fn test_parse_json_array() {
        let json_array = br#"[1,2,3,4,5]"#;
        let result = EarlyCloseJsonParser::parse_balanced_json(json_array);
        assert!(result.is_ok());
        let value = result.unwrap();
        assert!(value.is_array());
        if let Some(arr) = value.as_array() {
            assert_eq!(arr.len(), 5);
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_parse_json_string() {
        let json_string = br#""hello world""#;
        let result = EarlyCloseJsonParser::parse_balanced_json(json_string);
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value.as_str().unwrap_or(""), "hello world");
    }

    #[test]
    fn test_parse_json_number() {
        let json_number = b"42";
        let result = EarlyCloseJsonParser::parse_balanced_json(json_number);
        assert!(result.is_ok());
        let value = result.unwrap();
        // Number can be parsed as integer or float
        let num_value = value.as_i64().or_else(|| value.as_f64().map(|f| f as i64)).unwrap_or(0);
        assert_eq!(num_value, 42);
    }
}
