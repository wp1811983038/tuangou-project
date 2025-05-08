import random
import string
import uuid
from typing import List, Optional, Any, Union, Tuple

def random_string(length: int = 8, include_digits: bool = True, include_letters: bool = True, include_punctuation: bool = False) -> str:
    """
    生成随机字符串
    
    Args:
        length: 字符串长度
        include_digits: 是否包含数字
        include_letters: 是否包含字母
        include_punctuation: 是否包含标点符号
        
    Returns:
        随机字符串
    """
    chars = ""
    if include_digits:
        chars += string.digits
    if include_letters:
        chars += string.ascii_letters
    if include_punctuation:
        chars += string.punctuation
    
    if not chars:
        chars = string.ascii_lowercase
    
    return ''.join(random.choice(chars) for _ in range(length))

def random_digits(length: int = 6) -> str:
    """
    生成随机数字字符串
    
    Args:
        length: 字符串长度
        
    Returns:
        随机数字字符串
    """
    return ''.join(random.choice(string.digits) for _ in range(length))

def random_letters(length: int = 8, uppercase: bool = False) -> str:
    """
    生成随机字母字符串
    
    Args:
        length: 字符串长度
        uppercase: 是否大写
        
    Returns:
        随机字母字符串
    """
    letters = string.ascii_uppercase if uppercase else string.ascii_lowercase
    return ''.join(random.choice(letters) for _ in range(length))

def random_uuid() -> str:
    """
    生成随机UUID
    
    Returns:
        UUID字符串
    """
    return str(uuid.uuid4())

def random_int(min_val: int = 0, max_val: int = 100) -> int:
    """
    生成随机整数
    
    Args:
        min_val: 最小值
        max_val: 最大值
        
    Returns:
        随机整数
    """
    return random.randint(min_val, max_val)

def random_float(min_val: float = 0.0, max_val: float = 1.0) -> float:
    """
    生成随机浮点数
    
    Args:
        min_val: 最小值
        max_val: 最大值
        
    Returns:
        随机浮点数
    """
    return random.uniform(min_val, max_val)

def random_sample(population: List[Any], k: int = 1) -> List[Any]:
    """
    从列表中随机抽样
    
    Args:
        population: 总体列表
        k: 抽样数量
        
    Returns:
        抽样结果
    """
    return random.sample(population, min(k, len(population)))

def random_choice(sequence: List[Any]) -> Any:
    """
    从序列中随机选择一个元素
    
    Args:
        sequence: 序列
        
    Returns:
        随机元素
    """
    if not sequence:
        return None
    return random.choice(sequence)

def random_shuffle(sequence: List[Any]) -> List[Any]:
    """
    随机打乱序列
    
    Args:
        sequence: 序列
        
    Returns:
        打乱后的序列
    """
    result = sequence.copy()
    random.shuffle(result)
    return result

def weighted_random_choice(choices: List[Any], weights: List[Union[int, float]]) -> Any:
    """
    带权重的随机选择
    
    Args:
        choices: 选择列表
        weights: 权重列表
        
    Returns:
        随机选择结果
    """
    if not choices or not weights or len(choices) != len(weights):
        return None
    return random.choices(choices, weights=weights, k=1)[0]

def random_bool(true_probability: float = 0.5) -> bool:
    """
    生成随机布尔值
    
    Args:
        true_probability: 为True的概率
        
    Returns:
        随机布尔值
    """
    return random.random() < true_probability

def random_element_with_probability(elements: List[Tuple[Any, float]]) -> Any:
    """
    按概率随机选择元素
    
    Args:
        elements: 元素列表，每个元素为(值, 概率)
        
    Returns:
        随机选择的元素
    """
    if not elements:
        return None
    
    # 检查概率和是否为1
    total_probability = sum(prob for _, prob in elements)
    if abs(total_probability - 1.0) > 0.0001:
        # 重新调整概率
        normalized_elements = [(value, prob / total_probability) for value, prob in elements]
    else:
        normalized_elements = elements
    
    # 计算累积概率
    cum_prob = 0
    cum_distrib = []
    for value, prob in normalized_elements:
        cum_prob += prob
        cum_distrib.append((value, cum_prob))
    
    # 随机选择
    r = random.random()
    for value, cum_prob in cum_distrib:
        if r <= cum_prob:
            return value
    
    # 如果没有选中任何元素（可能由于浮点精度问题），返回最后一个元素
    return elements[-1][0]

def random_code(length: int = 6, char_set: str = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ") -> str:
    """
    生成随机验证码
    
    Args:
        length: 验证码长度
        char_set: 字符集
        
    Returns:
        随机验证码
    """
    return ''.join(random.choice(char_set) for _ in range(length))

def random_color() -> str:
    """
    生成随机十六进制颜色
    
    Returns:
        随机颜色，格式为#RRGGBB
    """
    r = random.randint(0, 255)
    g = random.randint(0, 255)
    b = random.randint(0, 255)
    return f"#{r:02x}{g:02x}{b:02x}"