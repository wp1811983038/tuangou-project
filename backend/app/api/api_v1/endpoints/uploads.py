from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, File, UploadFile, Form
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import upload_service

router = APIRouter()


@router.post("/file", response_model=schemas.upload.UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form("uploads"),
    current_user: schemas.user.User = Depends(deps.get_current_active_user)
) -> Any:
    """
    上传单个文件
    """
    # 获取上传配置
    config = await upload_service.get_upload_config()
    
    # 上传文件
    result = await upload_service.upload_file(
        file=file,
        folder=folder,
        allowed_extensions=config["allowed_extensions"],
        max_size=config["max_size"]
    )
    
    return result


@router.post("/files", response_model=schemas.upload.BatchUploadResponse)
async def upload_files(
    files: List[UploadFile] = File(...),
    folder: str = Form("uploads"),
    current_user: schemas.user.User = Depends(deps.get_current_active_user)
) -> Any:
    """
    批量上传文件
    """
    # 获取上传配置
    config = await upload_service.get_upload_config()
    
    # 上传文件
    results = await upload_service.upload_files(
        files=files,
        folder=folder,
        allowed_extensions=config["allowed_extensions"],
        max_size=config["max_size"]
    )
    
    return {
        "files": results,
        "total": len(results)
    }


@router.post("/images", response_model=schemas.upload.BatchUploadResponse)
async def upload_images(
    files: List[UploadFile] = File(...),
    folder: str = Form("images"),
    current_user: schemas.user.User = Depends(deps.get_current_active_user)
) -> Any:
    """
    批量上传图片
    """
    # 获取上传配置
    config = await upload_service.get_upload_config()
    
    # 验证文件类型
    image_extensions = ["jpg", "jpeg", "png", "gif", "webp"]
    
    # 上传文件
    results = await upload_service.upload_files(
        files=files,
        folder=folder,
        allowed_extensions=image_extensions,
        max_size=config["max_size"]
    )
    
    return {
        "files": results,
        "total": len(results)
    }


@router.get("/config", response_model=schemas.upload.UploadConfig)
async def get_upload_config(
    current_user: schemas.user.User = Depends(deps.get_current_active_user)
) -> Any:
    """
    获取上传配置
    """
    return await upload_service.get_upload_config()