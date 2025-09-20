"""
파일 업로드 API
이미지, 문서, 비디오, 오디오 파일 업로드를 처리합니다.
"""

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from extensions import db
from models.app_models import MessageAttachment, ChatMessage
from utils.file_manager import file_manager
from auth.middleware import check_authentication
from datetime import datetime
import os

# Blueprint 생성
file_upload_bp = Blueprint('file_upload', __name__, url_prefix='/api/files')

# 인증 미들웨어 적용
@file_upload_bp.before_request
def _file_upload_guard():
    return check_authentication()

@file_upload_bp.route('/upload', methods=['POST'])
def upload_file():
    """파일 업로드"""
    try:
        # 파일이 요청에 포함되어 있는지 확인
        if 'file' not in request.files:
            return jsonify({"error": "파일이 선택되지 않았습니다."}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "파일이 선택되지 않았습니다."}), 400
        
        # 파일 타입 확인
        file_type = request.form.get('file_type', 'image')
        user_id = request.form.get('user_id')
        message_id = request.form.get('message_id')
        
        # 파일 업로드
        file_metadata, message = file_manager.upload_file(file, file_type, user_id)
        
        if not file_metadata:
            return jsonify({"error": message}), 400
        
        # 데이터베이스에 파일 정보 저장
        if message_id:
            attachment = MessageAttachment(
                message_id=int(message_id),
                file_name=file_metadata['original_filename'],
                file_path=file_metadata['file_path'],
                file_size=file_metadata['file_size'],
                file_type=file_metadata['file_type'],
                mime_type=file_metadata['mime_type'],
                thumbnail_path=file_metadata['thumbnail_path']
            )
            db.session.add(attachment)
            db.session.commit()
            
            file_metadata['attachment_id'] = attachment.id
        
        return jsonify({
            "success": True,
            "message": message,
            "file_metadata": file_metadata
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"파일 업로드 중 오류가 발생했습니다: {str(e)}"}), 500

@file_upload_bp.route('/upload/multiple', methods=['POST'])
def upload_multiple_files():
    """다중 파일 업로드"""
    try:
        files = request.files.getlist('files')
        if not files:
            return jsonify({"error": "파일이 선택되지 않았습니다."}), 400
        
        file_type = request.form.get('file_type', 'image')
        user_id = request.form.get('user_id')
        message_id = request.form.get('message_id')
        
        uploaded_files = []
        failed_files = []
        
        for file in files:
            if file.filename == '':
                continue
                
            file_metadata, message = file_manager.upload_file(file, file_type, user_id)
            
            if file_metadata:
                # 데이터베이스에 파일 정보 저장
                if message_id:
                    attachment = MessageAttachment(
                        message_id=int(message_id),
                        file_name=file_metadata['original_filename'],
                        file_path=file_metadata['file_path'],
                        file_size=file_metadata['file_size'],
                        file_type=file_metadata['file_type'],
                        mime_type=file_metadata['mime_type'],
                        thumbnail_path=file_metadata['thumbnail_path']
                    )
                    db.session.add(attachment)
                    file_metadata['attachment_id'] = attachment.id
                
                uploaded_files.append(file_metadata)
            else:
                failed_files.append({
                    "filename": file.filename,
                    "error": message
                })
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "uploaded_files": uploaded_files,
            "failed_files": failed_files,
            "total_uploaded": len(uploaded_files),
            "total_failed": len(failed_files)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"다중 파일 업로드 중 오류가 발생했습니다: {str(e)}"}), 500

@file_upload_bp.route('/<int:attachment_id>', methods=['GET'])
def get_file_info(attachment_id):
    """파일 정보 조회"""
    try:
        attachment = MessageAttachment.query.get(attachment_id)
        if not attachment:
            return jsonify({"error": "파일을 찾을 수 없습니다."}), 404
        
        # 파일 존재 여부 확인
        file_info = file_manager.get_file_info(attachment.file_path)
        if not file_info:
            return jsonify({"error": "파일이 서버에 존재하지 않습니다."}), 404
        
        return jsonify({
            "success": True,
            "attachment": {
                "id": attachment.id,
                "message_id": attachment.message_id,
                "file_name": attachment.file_name,
                "file_path": attachment.file_path,
                "file_size": attachment.file_size,
                "file_type": attachment.file_type,
                "mime_type": attachment.mime_type,
                "thumbnail_path": attachment.thumbnail_path,
                "created_at": attachment.created_at.isoformat()
            },
            "file_info": file_info
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"파일 정보 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@file_upload_bp.route('/<int:attachment_id>', methods=['DELETE'])
def delete_file(attachment_id):
    """파일 삭제"""
    try:
        attachment = MessageAttachment.query.get(attachment_id)
        if not attachment:
            return jsonify({"error": "파일을 찾을 수 없습니다."}), 404
        
        # 파일 삭제
        success, message = file_manager.delete_file(attachment.file_path)
        
        # 썸네일도 삭제
        if attachment.thumbnail_path:
            file_manager.delete_file(attachment.thumbnail_path)
        
        if success:
            # 데이터베이스에서도 삭제
            db.session.delete(attachment)
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "파일이 성공적으로 삭제되었습니다."
            }), 200
        else:
            return jsonify({"error": message}), 500
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"파일 삭제 중 오류가 발생했습니다: {str(e)}"}), 500

@file_upload_bp.route('/message/<int:message_id>', methods=['GET'])
def get_message_attachments(message_id):
    """메시지의 첨부파일 목록 조회"""
    try:
        attachments = MessageAttachment.query.filter_by(message_id=message_id).all()
        
        attachment_list = []
        for attachment in attachments:
            file_info = file_manager.get_file_info(attachment.file_path)
            attachment_list.append({
                "id": attachment.id,
                "file_name": attachment.file_name,
                "file_size": attachment.file_size,
                "file_type": attachment.file_type,
                "mime_type": attachment.mime_type,
                "thumbnail_path": attachment.thumbnail_path,
                "created_at": attachment.created_at.isoformat(),
                "exists": file_info is not None
            })
        
        return jsonify({
            "success": True,
            "attachments": attachment_list,
            "total": len(attachment_list)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"첨부파일 목록 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@file_upload_bp.route('/storage/info', methods=['GET'])
def get_storage_info():
    """저장소 정보 조회"""
    try:
        storage_info = file_manager.get_storage_info()
        if not storage_info:
            return jsonify({"error": "저장소 정보를 가져올 수 없습니다."}), 500
        
        return jsonify({
            "success": True,
            "storage_info": storage_info
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"저장소 정보 조회 중 오류가 발생했습니다: {str(e)}"}), 500

@file_upload_bp.route('/cleanup', methods=['POST'])
def cleanup_files():
    """임시 파일 정리"""
    try:
        max_age_hours = request.json.get('max_age_hours', 24) if request.json else 24
        file_manager.cleanup_temp_files(max_age_hours)
        
        return jsonify({
            "success": True,
            "message": f"{max_age_hours}시간 이상 된 임시 파일이 정리되었습니다."
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"파일 정리 중 오류가 발생했습니다: {str(e)}"}), 500

@file_upload_bp.route('/serve/<int:attachment_id>', methods=['GET'])
def serve_file(attachment_id):
    """파일 서빙 (다운로드)"""
    try:
        attachment = MessageAttachment.query.get(attachment_id)
        if not attachment:
            return jsonify({"error": "파일을 찾을 수 없습니다."}), 404
        
        if not os.path.exists(attachment.file_path):
            return jsonify({"error": "파일이 서버에 존재하지 않습니다."}), 404
        
        from flask import send_file
        return send_file(
            attachment.file_path,
            as_attachment=True,
            download_name=attachment.file_name,
            mimetype=attachment.mime_type
        )
        
    except Exception as e:
        return jsonify({"error": f"파일 서빙 중 오류가 발생했습니다: {str(e)}"}), 500

@file_upload_bp.route('/thumbnail/<int:attachment_id>', methods=['GET'])
def serve_thumbnail(attachment_id):
    """썸네일 서빙"""
    try:
        attachment = MessageAttachment.query.get(attachment_id)
        if not attachment:
            return jsonify({"error": "파일을 찾을 수 없습니다."}), 404
        
        if not attachment.thumbnail_path or not os.path.exists(attachment.thumbnail_path):
            return jsonify({"error": "썸네일을 찾을 수 없습니다."}), 404
        
        from flask import send_file
        return send_file(
            attachment.thumbnail_path,
            as_attachment=False,
            mimetype='image/jpeg'
        )
        
    except Exception as e:
        return jsonify({"error": f"썸네일 서빙 중 오류가 발생했습니다: {str(e)}"}), 500
