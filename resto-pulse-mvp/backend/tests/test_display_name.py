from app.services.display_name import mask_person_name, public_author_name


def test_mask_person_name():
    assert mask_person_name("Aykut Avcı") == "ay*** av***"
    assert mask_person_name("Ali") == "al***"


def test_public_author_name_full():
    assert public_author_name("Aykut Avcı", "full") == "Aykut Avcı"


def test_public_author_name_masked():
    assert public_author_name("Aykut Avcı", "masked") == "ay*** av***"
