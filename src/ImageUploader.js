import React, { useState, useRef, useEffect } from 'react';

const ImageUploader = () => {
    const [content, setContent] = useState('');
    const contentEditableRef = useRef(null);

    const handleImageChange = (event) => {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const imgTag = `<img src="${reader.result}" style="max-width: 100%; margin: 5px;" draggable="false" ondragstart="return false;" />`;
                insertAtCursor(imgTag);
            };
            reader.readAsDataURL(file);
        });
    };

    const insertAtCursor = (imgTag) => {
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (range) {
            const imgNode = document.createElement('div');
            imgNode.innerHTML = imgTag; // 이미지 태그를 div에 추가
            const frag = document.createDocumentFragment();
            let child;
            while ((child = imgNode.firstChild)) {
                frag.appendChild(child);
            }
            range.insertNode(frag); // 커서 위치에 이미지 삽입

            // 이미지 다음에 스페이스바 효과 추가
            const spaceNode = document.createTextNode(' '); // 공백 노드 생성
            range.insertNode(spaceNode); // 공백 노드 삽입
            range.setStartAfter(spaceNode); // 커서를 공백 노드 뒤로 이동
            selection.removeAllRanges();
            selection.addRange(range); // 선택 영역 업데이트

            // 상태 업데이트
            setContent(contentEditableRef.current.innerHTML);
        }
    };

    const handleContentChange = () => {
        setContent(contentEditableRef.current.innerHTML);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('게시글 내용:', content);
        // 여기서 API 호출 등을 통해 게시글을 저장할 수 있습니다.
    };

    // 포커스를 contentEditable에 주기 위한 useEffect
    useEffect(() => {
        contentEditableRef.current.focus();
    }, []);

    // 드래그 이벤트 방지
    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const imgTag = `<img src="${reader.result}" style="max-width: 100%; margin: 5px;" draggable="false" ondragstart="return false;" />`;
                insertAtCursor(imgTag);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDragStart = (e) => {
        e.preventDefault(); // 드래그 시작 방지
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>본문:</label>
                    <div
                        ref={contentEditableRef}
                        contentEditable
                        onInput={handleContentChange}
                        onDragOver={handleDragOver} // 드래그 오버 이벤트 방지
                        onDrop={handleDrop} // 드롭 이벤트 처리
                        onDragStart={handleDragStart} // 드래그 시작 방지
                        style={{
                            border: '1px solid #ccc',
                            minHeight: '100px',
                            padding: '10px',
                            margin: '10px 0',
                            borderRadius: '4px',
                        }}
                        placeholder="여기에 내용을 입력하세요..."
                    />
                </div>
                <div>
                    <button type="button" onClick={() => document.getElementById('image-upload').click()} style={{ margin: '20px 0' }}>
                        이미지 업로드
                    </button>
                    <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                        multiple
                    />
                </div>
                <button type="submit">게시글 작성</button>
            </form>
            <div>
                <h3>게시글 미리보기:</h3>
                <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
        </div>
    );
};

export default ImageUploader;
