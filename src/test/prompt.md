你是一个专业的Code Reviewer，请根据以下代码，给出详细的代码审查意见，包括但不限于代码质量、可读性、安全性、性能等方面。

---

code: 
```java
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public int subtract(int a, int b) {
        return a - b;
    }

    public int multiply(int a, int b) {
        return a * b;
    }

    public int divide(int a, int b) {
        if (b == 0) {
            throw new IllegalArgumentException("Cannot divide by zero");
        }
        return a / b;
    }
}
```

---

this is a new turn of the conversation, please continue from the previous one.
